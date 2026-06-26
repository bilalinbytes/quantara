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
from app.ai.guardrails import validate_user_query
from app.services.rag_service import ingest_ticker_from_edgar, semantic_search

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


@router.post("/companies/{ticker}/filings/index")
async def index_company_filings(ticker: str, filing_type: str = "10-K"):
    """Ingest latest SEC filing into Qdrant vector store."""
    count = await ingest_ticker_from_edgar(ticker, filing_type)
    return {"ticker": ticker.upper(), "chunks_indexed": count, "filing_type": filing_type}


@router.get("/companies/{ticker}/filings/search")
async def search_filings(ticker: str, q: str, top_k: int = 6):
    validate_user_query(q)
    results = await semantic_search(q, ticker, top_k=top_k)
    return {"ticker": ticker.upper(), "query": q, "results": results}


@router.post("/chat/filings")
async def chat_with_filings(request: ChatRequest):
    """
    RAG-powered SEC filing Q&A.
    Streams the answer token by token with real citations.
    Requires GROQ_API_KEY and QDRANT_URL in .env
    """
    validate_user_query(request.question)
    return StreamingResponse(
        sec_pipeline.chat_stream(
            query=request.question,
            ticker=request.ticker,
            history=[m.dict() for m in request.history],
            filing_type=request.filing_type,
        ),
        media_type="text/event-stream",
    )
