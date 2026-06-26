from sqlalchemy import Column, String, DateTime, Enum, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base
import uuid
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, unique=True)
    display_name = Column(String(100))
    tier = Column(String(50), default="free")
    created_at = Column(DateTime, default=datetime.utcnow)

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String(10), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False)
    exchange = Column(String(20), nullable=False)
    sector = Column(String(100), index=True)
    industry = Column(String(100))
    cik = Column(String(10))
    logo_url = Column(String)
    description_ai = Column(String)
    last_synced_at = Column(DateTime)
