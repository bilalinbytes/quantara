from fastapi import APIRouter, Depends, Query
from app.schemas.company import SearchResult, CompanyProfile, CompanyPrice, CompanyMetrics, CompanyHistory, AISummary
from app.schemas.financials import CompanyFinancials, AIFinancialAnalysis
from app.services.market_data import MarketDataService, AIService
from typing import Dict, Any

router = APIRouter()

@router.get("/search")
async def search_companies(q: str = Query(..., min_length=2)):
    return await MarketDataService.get_search(q)

@router.get("/companies/{ticker}", response_model=CompanyProfile)
async def get_company_profile(ticker: str):
    return await MarketDataService.get_profile(ticker)

@router.get("/companies/{ticker}/price", response_model=CompanyPrice)
async def get_company_price(ticker: str):
    return await MarketDataService.get_price(ticker)

@router.get("/companies/{ticker}/metrics", response_model=CompanyMetrics)
async def get_company_metrics(ticker: str):
    return await MarketDataService.get_metrics(ticker)

@router.get("/companies/{ticker}/history", response_model=CompanyHistory)
async def get_company_history(ticker: str, range: str = "1Y"):
    return await MarketDataService.get_history(ticker, range)

@router.get("/companies/{ticker}/ai-summary", response_model=AISummary)
async def get_company_ai_summary(ticker: str):
    return await AIService.generate_summary(ticker)

@router.get("/companies/{ticker}/financials", response_model=CompanyFinancials)
async def get_company_financials(ticker: str):
    return await MarketDataService.get_financials(ticker)

@router.post("/companies/{ticker}/financial-analysis", response_model=AIFinancialAnalysis)
async def generate_financial_analysis(ticker: str):
    return await AIService.generate_financial_analysis(ticker)


@router.get("/companies/{ticker}/context")
async def get_company_context(ticker: str):
    """Shared cached context bundle — used by all AI features."""
    from app.services.context_service import fetch_company_context
    bundle = await fetch_company_context(ticker.upper())
    return {
        "ticker": bundle.get("ticker"),
        "company_name": bundle.get("company_name"),
        "source_count": bundle.get("source_count"),
        "confidence": bundle.get("confidence"),
        "sources_used": bundle.get("sources_used"),
        "missing_sources": bundle.get("missing_sources"),
        "evidence": bundle.get("evidence"),
    }
