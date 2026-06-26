"""
AI chat endpoint — shared context service + Groq + persistent sessions.
"""
import json
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import models
from app.services.llm_service import groq_ok
from app.services.context_service import fetch_company_context
from app.ai.pipelines.intelligence_pipeline import run_intelligence_pipeline
from app.ai.guardrails import validate_user_query

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


def _detect_intent(q: str) -> str:
    q = q.lower()
    if any(kw in q for kw in ["invest", "buy", "worth", "long term", "portfolio", "thesis"]):
        return "investment"
    if any(kw in q for kw in ["risk", "danger", "downside", "bearish", "concern"]):
        return "risk"
    if any(kw in q for kw in ["valuation", "overvalue", "undervalue", "pe", "fair value"]):
        return "valuation"
    if any(kw in q for kw in ["news", "moving", "catalyst", "today", "latest"]):
        return "news"
    if any(kw in q for kw in ["earnings", "revenue", "eps", "guidance", "quarterly"]):
        return "earnings"
    if any(kw in q for kw in ["report", "research", "institutional"]):
        return "research"
    if any(kw in q for kw in ["10-k", "10-q", "sec", "filing"]):
        return "sec"
    return "general"


async def _chat_stream_generator(ticker: str, question: str, session_id: Optional[int]):
    from app.db.database import SessionLocal
    db = SessionLocal()
    try:
        t = ticker.upper()
        validate_user_query(question)
        intent = _detect_intent(question)

        yield f"data: {json.dumps({'status': 'Fetching live market context…'})}\n\n"
        bundle = await fetch_company_context(t)
        session = _get_or_create_session(db, t, session_id, _auto_title(question))
        history_msgs = [{"role": m.role, "content": m.content} for m in session.messages[-8:]]

        yield f"data: {json.dumps({'status': 'Analyzing with Groq…'})}\n\n"
        result = await run_intelligence_pipeline(question=question, ticker=t, history=history_msgs)
        summary = result.get("summary", "") or "Analysis unavailable."

        # Stream summary back in word chunks (single Groq call — avoids 429 rate limits)
        words = summary.split(" ")
        streamed = ""
        for i, word in enumerate(words):
            chunk = ("" if i == 0 else " ") + word
            streamed += chunk
            yield f"data: {json.dumps({'token': chunk})}\n\n"

        db.add(models.ChatMessage(session_id=session.id, role="user", content=question))
        db.add(models.ChatMessage(
            session_id=session.id, role="assistant", content=streamed,
            intent=intent, confidence=str(result.get("confidence", "")),
            sources=json.dumps(result.get("sources_used", [])),
            citations=json.dumps(result.get("evidence", [])),
            investment_card=json.dumps(result),
        ))
        session.updated_at = datetime.utcnow()
        if session.title == "New Conversation":
            session.title = _auto_title(question)
        db.commit()

        yield f"data: {json.dumps({'done': True, 'session_id': session.id, 'intent': intent, **result})}\n\n"
    except HTTPException as e:
        yield f"data: {json.dumps({'error': e.detail})}\n\n"
    except Exception as e:
        logger.exception("Chat stream failed")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
    finally:
        db.close()


@router.post("/companies/{ticker}/chat/stream")
async def chat_stream(ticker: str, request: ChatRequest):
    if not groq_ok():
        raise HTTPException(status_code=503, detail="GROQ_API_KEY required.")
    validate_user_query(request.question)
    return StreamingResponse(
        _chat_stream_generator(ticker, request.question, request.session_id),
        media_type="text/event-stream",
    )


@router.post("/companies/{ticker}/chat")
async def chat_with_company(ticker: str, request: ChatRequest, db: Session = Depends(get_db)):
    t = ticker.upper()

    if not groq_ok():
        raise HTTPException(
            status_code=503,
            detail="AI chat requires GROQ_API_KEY. Set LLM_PROVIDER=groq in your .env file.",
        )

    validate_user_query(request.question)
    intent = _detect_intent(request.question)

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
