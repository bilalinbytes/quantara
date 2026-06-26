from pydantic import BaseModel
from typing import List, Optional

class FilingMetadata(BaseModel):
    id: str
    ticker: str
    date: str
    type: str
    size: str
    status: str

class FilingListResponse(BaseModel):
    filings: List[FilingMetadata]

class FilingSection(BaseModel):
    id: str
    title: str
    content: str

class FilingParsedResponse(BaseModel):
    id: str
    ticker: str
    type: str
    sections: List[FilingSection]

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    question: str
    ticker: str
    filing_type: Optional[str] = None
    history: List[ChatMessage] = []

class Citation(BaseModel):
    text: str
    section: str
    confidence: float

class ChatResponse(BaseModel):
    answer: str
    citations: List[Citation]
    confidence: str
