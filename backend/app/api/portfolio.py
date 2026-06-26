"""Portfolio analytics — comparative research across watchlist tickers."""
import asyncio
from typing import List, Optional

from fastapi import APIRouter, Query

from app.services.context_service import fetch_company_context, compute_confidence

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("/analytics")
async def portfolio_analytics(
    tickers: str = Query(..., description="Comma-separated tickers, e.g. MSFT,AAPL,NVDA"),
):
    symbols = [t.strip().upper() for t in tickers.split(",") if t.strip()][:10]
    if not symbols:
        return {"error": "Provide at least one ticker"}

    bundles = await asyncio.gather(*[fetch_company_context(t) for t in symbols])

    companies = []
    for b in bundles:
        data = b.get("data") or {}
        quote = (data.get("live_quote") or [{}])[0] if data.get("live_quote") else {}
        profile = (data.get("company_profile") or [{}])[0] if data.get("company_profile") else {}
        metrics = (data.get("key_metrics") or [{}])[0] if data.get("key_metrics") else {}
        ratios = (data.get("financial_ratios") or [{}])[0] if data.get("financial_ratios") else {}
        tech = data.get("technical_indicators") or {}

        companies.append({
            "ticker": b.get("ticker"),
            "name": b.get("company_name"),
            "price": quote.get("price"),
            "change_pct": quote.get("changesPercentage") or quote.get("change_1d"),
            "market_cap": profile.get("mktCap") or profile.get("market_cap"),
            "sector": profile.get("sector"),
            "pe_ratio": ratios.get("priceToEarningsRatio") or ratios.get("peRatio"),
            "revenue_growth": metrics.get("revenueGrowth"),
            "roe": ratios.get("returnOnEquity"),
            "trend": tech.get("trend"),
            "confidence": b.get("confidence"),
            "sources_used": b.get("sources_used"),
            "missing_sources": b.get("missing_sources"),
        })

    avg_confidence = round(
        sum(c.get("confidence") or 0 for c in companies) / len(companies), 1
    ) if companies else 0

    leaders = sorted(
        [c for c in companies if c.get("change_pct") is not None],
        key=lambda x: float(x.get("change_pct") or 0),
        reverse=True,
    )

    return {
        "tickers": symbols,
        "company_count": len(companies),
        "average_confidence": avg_confidence,
        "companies": companies,
        "performance_leaders": leaders[:3],
        "comparison_summary": {
            "best_performer": leaders[0]["ticker"] if leaders else None,
            "highest_confidence": max(companies, key=lambda c: c.get("confidence") or 0)["ticker"] if companies else None,
        },
    }


@router.get("/compare")
async def compare_companies(
    a: str = Query(...),
    b: str = Query(...),
):
    ba, bb = await asyncio.gather(fetch_company_context(a.upper()), fetch_company_context(b.upper()))
    return {
        "comparison": [a.upper(), b.upper()],
        "a": {"ticker": ba.get("ticker"), "confidence": ba.get("confidence"), "sources": ba.get("sources_used")},
        "b": {"ticker": bb.get("ticker"), "confidence": bb.get("confidence"), "sources": bb.get("sources_used")},
        "evidence": {
            a.upper(): ba.get("evidence"),
            b.upper(): bb.get("evidence"),
        },
    }
