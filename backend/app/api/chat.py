"""
AI chat endpoint — shared context service + Groq + persistent sessions.
"""
import json
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import models
from app.services.llm_service import groq_ok
from app.ai.pipelines.intelligence_pipeline import run_intelligence_pipeline

router = APIRouter()
logger = logging.getLogger("chat")

DEFAULT_USER_ID = 1


class ChatRequest(BaseModel):
    question: str
    session_id: Optional[int] = None
    context_type: Optional[str] = "general"


class SessionRenameRequest(BaseModel):
    title: str


def _get_or_create_user(db: Session) -> models.User:
    user = db.query(models.User).filter(models.User.id == DEFAULT_USER_ID).first()
    if not user:
        user = models.User(id=DEFAULT_USER_ID, email="anon@quantara.ai", name="Anonymous")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def _get_or_create_session(db: Session, ticker: str, session_id: Optional[int], title: str) -> models.ChatSession:
    if session_id:
        s = db.query(models.ChatSession).filter(
            models.ChatSession.id == session_id,
            models.ChatSession.is_deleted == False
        ).first()
        if s:
            return s
    _get_or_create_user(db)
    s = models.ChatSession(user_id=DEFAULT_USER_ID, ticker=ticker.upper(), title=title[:80])
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


def _auto_title(question: str) -> str:
    words = question.strip().split()
    title = " ".join(words[:8])
    return title if len(title) > 5 else question[:60]


@router.post("/companies/{ticker}/chat")
async def chat_with_company(ticker: str, request: ChatRequest, db: Session = Depends(get_db)):
    t = ticker.upper()

    if not groq_ok():
        raise HTTPException(
            status_code=503,
            detail="AI chat requires GROQ_API_KEY. Set LLM_PROVIDER=groq in your .env file.",
        )

    q = request.question.lower()
    if any(kw in q for kw in ["invest", "buy", "worth", "long term", "portfolio", "thesis"]):
        intent = "investment"
    elif any(kw in q for kw in ["risk", "danger", "downside", "bearish", "concern"]):
        intent = "risk"
    elif any(kw in q for kw in ["valuation", "overvalue", "undervalue", "pe", "fair value"]):
        intent = "valuation"
    elif any(kw in q for kw in ["news", "moving", "catalyst", "today", "latest"]):
        intent = "news"
    elif any(kw in q for kw in ["earnings", "revenue", "eps", "guidance", "quarterly"]):
        intent = "earnings"
    elif any(kw in q for kw in ["report", "research", "institutional"]):
        intent = "research"
    elif any(kw in q for kw in ["10-k", "10-q", "sec", "filing"]):
        intent = "sec"
    else:
        intent = "general"

    session = _get_or_create_session(db, t, request.session_id, _auto_title(request.question))
    history_msgs = [{"role": m.role, "content": m.content} for m in session.messages[-8:]]

    result = await run_intelligence_pipeline(
        question=request.question,
        ticker=t,
        history=history_msgs,
    )

    db.add(models.ChatMessage(session_id=session.id, role="user", content=request.question))
    db.add(models.ChatMessage(
        session_id=session.id,
        role="assistant",
        content=result.get("summary", ""),
        intent=intent,
        confidence=str(result.get("confidence", "")),
        sources=json.dumps(result.get("sources_used", [])),
        citations=json.dumps(result.get("evidence", [])),
        investment_card=json.dumps(result),
    ))
    session.updated_at = datetime.utcnow()
    if session.title == "New Conversation":
        session.title = _auto_title(request.question)
    db.commit()

    return {"ticker": t, "question": request.question, "session_id": session.id, "intent": intent, **result}


@router.get("/companies/{ticker}/chat/sessions")
def list_sessions(ticker: str, db: Session = Depends(get_db)):
    sessions = (
        db.query(models.ChatSession)
        .filter(
            models.ChatSession.ticker == ticker.upper(),
            models.ChatSession.user_id == DEFAULT_USER_ID,
            models.ChatSession.is_deleted == False,
        )
        .order_by(models.ChatSession.updated_at.desc())
        .all()
    )
    now = datetime.utcnow()
    groups = {"Today": [], "Yesterday": [], "Last 7 Days": [], "Older": []}
    for s in sessions:
        delta = (now - s.updated_at).days if s.updated_at else 9999
        if delta == 0:
            groups["Today"].append(s)
        elif delta == 1:
            groups["Yesterday"].append(s)
        elif delta <= 7:
            groups["Last 7 Days"].append(s)
        else:
            groups["Older"].append(s)

    def fmt(s):
        return {"id": s.id, "title": s.title, "ticker": s.ticker, "updated_at": s.updated_at.isoformat() if s.updated_at else None}

    return {k: [fmt(s) for s in v] for k, v in groups.items() if v}


@router.get("/chat/sessions/{session_id}/messages")
def get_session_messages(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.is_deleted == False,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    msgs = []
    for m in session.messages:
        card = None
        if m.investment_card:
            try:
                card = json.loads(m.investment_card)
            except Exception:
                pass
        msgs.append({
            "id": m.id, "role": m.role, "content": m.content,
            "intent": m.intent, "confidence": m.confidence,
            "sources": json.loads(m.sources) if m.sources else [],
            "citations": json.loads(m.citations) if m.citations else [],
            "investment_card": card,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })
    return {"session_id": session_id, "ticker": session.ticker, "title": session.title, "messages": msgs}


@router.patch("/chat/sessions/{session_id}")
def rename_session(session_id: int, body: SessionRenameRequest, db: Session = Depends(get_db)):
    s = db.query(models.ChatSession).filter(models.ChatSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    s.title = body.title[:80]
    db.commit()
    return {"id": s.id, "title": s.title}


@router.delete("/chat/sessions/{session_id}", status_code=204)
def delete_session(session_id: int, db: Session = Depends(get_db)):
    s = db.query(models.ChatSession).filter(models.ChatSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    s.is_deleted = True
    db.commit()
    return None
