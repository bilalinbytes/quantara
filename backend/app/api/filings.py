"""
SEC Filings API — backed by real SEC EDGAR integration.
No hardcoded filings, no placeholder section text.
"""
import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.schemas.filings import FilingListResponse, FilingParsedResponse, ChatRequest
from app.services.sec_service import SecService
from app.ai.pipelines.sec_pipeline import SecPipeline
from app.db.database import get_db

router = APIRouter()
logger = logging.getLogger("filings")
sec_pipeline = SecPipeline()


@router.get("/companies/{ticker}/filings")
async def get_company_filings(ticker: str):
    """Return real filings from SEC EDGAR for the given ticker."""
    return await SecService.get_filings(ticker)


@router.get("/companies/{ticker}/filings/{filing_id}")
async def get_parsed_filing(ticker: str, filing_id: str):
    """Parse and return a specific SEC filing with extracted sections."""
    return await SecService.get_parsed_filing(ticker, filing_id)


@router.post("/chat/filings")
async def chat_with_filings(request: ChatRequest):
    """
    RAG-powered SEC filing Q&A.
    Streams the answer token by token with real citations.
    Requires GROQ_API_KEY and QDRANT_URL in .env
    """
    return StreamingResponse(
        sec_pipeline.chat_stream(
            query=request.question,
            ticker=request.ticker,
            history=[m.dict() for m in request.history],
            filing_type=request.filing_type,
        ),
        media_type="text/event-stream",
    )
