from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=True)
    name = Column(String, nullable=True)
    role = Column(String, default="user")
    preferences = Column(String, default="{}")
    api_key = Column(String, unique=True, index=True, nullable=True)
    oauth_provider = Column(String, nullable=True)
    oauth_subject = Column(String, nullable=True, index=True)
    watchlists = relationship("Watchlist", back_populates="user")
    refresh_tokens = relationship("RefreshToken", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    expires_at = Column(DateTime)
    is_revoked = Column(Boolean, default=False)
    is_rotated = Column(Boolean, default=False)
    user = relationship("User", back_populates="refresh_tokens")


class Watchlist(Base):
    __tablename__ = "watchlists"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="watchlists")
    items = relationship("WatchlistItem", back_populates="watchlist")


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, index=True)
    watchlist_id = Column(Integer, ForeignKey("watchlists.id"))
    watchlist = relationship("Watchlist", back_populates="items")


class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, index=True)
    title = Column(String)
    summary = Column(String)
    why_it_matters = Column(String)
    impact = Column(String)
    confidence = Column(String)
    source = Column(String)
    severity = Column(String)
    is_read = Column(Boolean, default=False)
    is_pinned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class DailyBriefing(Base):
    __tablename__ = "daily_briefings"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class ResearchNote(Base):
    __tablename__ = "research_notes"
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, index=True)
    title = Column(String)
    content = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class AgentRun(Base):
    __tablename__ = "agent_runs"
    id = Column(Integer, primary_key=True, index=True)
    agent_name = Column(String)
    status = Column(String)
    logs = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


# ─── Chat History (persistent, ChatGPT-style) ─────────────────────────────

class ChatSession(Base):
    """One conversation thread per ticker per user."""
    __tablename__ = "chat_sessions"
    id = Column(Integer, primary_key=True, index=True)
    # anonymous sessions use user_id = 1 (default user)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    ticker = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False, default="New Conversation")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted = Column(Boolean, default=False)
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship(
        "ChatMessage", back_populates="session",
        order_by="ChatMessage.created_at", cascade="all, delete-orphan"
    )


class ChatMessage(Base):
    """Individual message within a ChatSession."""
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False, index=True)
    role = Column(String, nullable=False)          # 'user' | 'assistant'
    content = Column(Text, nullable=False)
    intent = Column(String, nullable=True)
    confidence = Column(String, nullable=True)
    sources = Column(Text, nullable=True)          # JSON array stored as text
    citations = Column(Text, nullable=True)        # JSON array stored as text
    investment_card = Column(Text, nullable=True)  # JSON object — structured card data
    created_at = Column(DateTime, default=datetime.utcnow)
    session = relationship("ChatSession", back_populates="messages")


