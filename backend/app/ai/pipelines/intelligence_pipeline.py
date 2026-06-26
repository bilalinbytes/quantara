"""Quantara AI pipeline — resilient context builder + Groq structured responses."""
import json
import logging
import re
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from app.services.context_service import (
    fetch_company_context,
    build_context_prompt,
    compute_confidence,
)
from app.services.llm_service import llm_complete, groq_ok, QUANTARA_SYSTEM

logger = logging.getLogger("intelligence")

TICKER_RE = re.compile(r"\b([A-Z]{1,5})\b")

RESPONSE_SCHEMA = """{
  "summary": "string — direct actionable answer using ALL available evidence",
  "recommendation": "Strong Buy|Buy|Hold|Sell|Strong Sell",
  "confidence": "integer 0-100 — must reflect available evidence count",
  "investment_score": "integer 0-100",
  "bullish_points": ["string"],
  "bearish_points": ["string"],
  "financial_health": "string",
  "valuation": "string",
  "technical_analysis": "string",
  "price_target": "string",
  "risks": ["string"],
  "catalysts": ["string"],
  "sources_used": ["string"],
  "missing_sources": ["string"],
  "follow_up_questions": ["string"],
  "investor_takeaway": "string",
  "market_sentiment": "Bullish|Bearish|Neutral",
  "upcoming_events": ["string"]
}"""


def extract_ticker(question: str, default_ticker: Optional[str] = None) -> str:
    if default_ticker:
        return default_ticker.upper()
    known = {
        "microsoft": "MSFT", "apple": "AAPL", "nvidia": "NVDA", "google": "GOOGL",
        "alphabet": "GOOGL", "amazon": "AMZN", "tesla": "TSLA", "meta": "META",
        "netflix": "NFLX", "amd": "AMD", "intel": "INTC",
    }
    q_lower = question.lower()
    for name, sym in known.items():
        if name in q_lower:
            return sym
    matches = TICKER_RE.findall(question.upper())
    if matches:
        return matches[0]
    return (default_ticker or "SPY").upper()


def _fallback_points(bundle: Dict[str, Any], kind: str) -> List[str]:
    data = bundle.get("data") or {}
    points: List[str] = []
    if kind == "bullish":
        for n in (data.get("latest_news") or [])[:3]:
            points.append(f"News: {n.get('title', '')[:100]}")
        q = (data.get("live_quote") or [{}])[0]
        if q.get("changesPercentage") and float(q.get("changesPercentage") or 0) > 0:
            points.append(f"Stock up {q['changesPercentage']}% today")
        tech = data.get("technical_indicators") or {}
        if tech.get("trend") == "Bullish":
            points.append("Technical trend is bullish (SMA20 > SMA50)")
    else:
        missing = bundle.get("missing_sources") or []
        if missing:
            points.append(f"Analysis limited — unavailable: {', '.join(missing[:3])}")
        for n in (data.get("latest_news") or []):
            t = (n.get("title") or "").lower()
            if any(w in t for w in ["down", "miss", "cut", "lawsuit", "decline"]):
                points.append(f"News headwind: {n.get('title', '')[:100]}")
    return points[:3] or [f"Review {kind} factors using available {bundle.get('source_count', 0)} data sources"]


def _ensure_response(result: dict, bundle: Dict[str, Any]) -> dict:
    """Enforce non-empty arrays, computed confidence, evidence metadata."""
    computed_conf = bundle.get("confidence", compute_confidence(bundle.get("source_count", 0)))
    result["confidence"] = computed_conf
    result["sources_used"] = bundle.get("sources_used", [])
    result["missing_sources"] = bundle.get("missing_sources", [])
    result["evidence"] = bundle.get("evidence", [])

    array_fields = {
        "bullish_points": lambda: _fallback_points(bundle, "bullish"),
        "bearish_points": lambda: _fallback_points(bundle, "bearish"),
        "risks": lambda: [f"Data gap: {s}" for s in (bundle.get("missing_sources") or [])[:3]] or ["Monitor market volatility"],
        "catalysts": lambda: [n.get("title", "")[:120] for n in (bundle.get("data", {}).get("latest_news") or [])[:3]] or ["Track upcoming earnings and macro events"],
        "follow_up_questions": lambda: [
            "What are the key risks from the latest SEC filing?",
            "How does valuation compare to sector peers?",
            "What catalysts could move the stock in the next quarter?",
        ],
        "upcoming_events": lambda: ["Earnings date — check company IR calendar", "Monitor Fed/macro calendar"],
    }
    for field, fallback_fn in array_fields.items():
        if not result.get(field):
            result[field] = fallback_fn()

    # Strip refusal language when we have any evidence
    if bundle.get("source_count", 0) > 0:
        summary = result.get("summary", "")
        for phrase in ["insufficient data", "unable to analyze", "not enough information", "insufficient evidence"]:
            if phrase in summary.lower():
                result["summary"] = summary.replace(phrase, "Based on available sources").replace(phrase.title(), "Based on available sources")

    return result


def _backward_compat(result: dict, bundle: Dict[str, Any]) -> dict:
    data = bundle.get("data") or {}
    result["ticker"] = bundle.get("ticker")
    result["company_name"] = bundle.get("company_name")
    result["executive_summary"] = result.get("summary", "")
    result["why_moving"] = result.get("summary", "")[:500]
    result["daily_ai_summary"] = result.get("summary", "")
    result["positive_drivers"] = result.get("bullish_points", [])
    result["negative_drivers"] = result.get("bearish_points", [])
    result["positive_news"] = result.get("bullish_points", [])
    result["negative_news"] = result.get("bearish_points", [])
    result["important_catalysts"] = result.get("catalysts", [])
    result["market_outlook"] = result.get("market_sentiment", "Neutral")
    result["press_releases"] = data.get("press_releases") or []
    result["analyst_ratings_detail"] = [
        f"{r.get('rating', r.get('grade', 'N/A'))} — {r.get('date', '')}"
        for r in (data.get("analyst_ratings") or [])[:8]
        if isinstance(r, dict)
    ] or ["Analyst ratings unavailable"]
    result["sources"] = result.get("sources_used", [])
    result["technical_outlook"] = result.get("technical_analysis", "")
    result["confidence_label"] = (
        "High" if int(result.get("confidence", 0)) >= 75
        else "Medium" if int(result.get("confidence", 0)) >= 50
        else "Low"
    )
    result["latest_news"] = data.get("latest_news") or []
    return result


async def run_intelligence_pipeline(
    question: str,
    ticker: Optional[str] = None,
    history: Optional[List[Dict]] = None,
) -> Dict[str, Any]:
    if not groq_ok():
        raise HTTPException(status_code=503, detail="GROQ_API_KEY required. Set LLM_PROVIDER=groq in .env.")

    t = extract_ticker(question, ticker)
    bundle = await fetch_company_context(t)

    if bundle.get("source_count", 0) == 0:
        raise HTTPException(
            status_code=503,
            detail="All data sources unavailable. Check API keys and network connectivity.",
        )

    context_prompt = build_context_prompt(bundle, question, history)

    system = (
        QUANTARA_SYSTEM + "\n\n"
        "Return ONLY valid JSON matching this schema:\n" + RESPONSE_SCHEMA + "\n\n"
        "Rules:\n"
        "- Use EVERY available source in your analysis.\n"
        "- Never refuse because one API failed.\n"
        "- Mention missing sources in missing_sources field, not as a reason to stop.\n"
        "- Use specific numbers from financials when present.\n"
        "- Never return empty arrays.\n"
        "- Only say data is limited if a specific field truly has no supporting evidence.\n"
        f"- Your confidence should be near {bundle.get('confidence')}% given {bundle.get('source_count')} sources available."
    )

    raw = await llm_complete(system, f"Financial context:\n\n{context_prompt}", max_tokens=2200)
    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Groq returned invalid JSON.")

    result = _ensure_response(result, bundle)
    return _backward_compat(result, bundle)


# Legacy aliases used by other modules
async def fetch_context(ticker: str) -> Dict[str, Any]:
    bundle = await fetch_company_context(ticker)
    data = bundle.get("data") or {}
    data["ticker"] = bundle.get("ticker")
    data["company_name"] = bundle.get("company_name")
    data["sources_used"] = bundle.get("sources_used")
    data["missing_sources"] = bundle.get("missing_sources")
    data["confidence"] = bundle.get("confidence")
    data["evidence"] = bundle.get("evidence")
    data["news_articles"] = data.get("latest_news") or []
    data["press_releases_normalized"] = data.get("press_releases") or []
    return data


def _ensure_arrays(result: dict) -> dict:
    for field in ["bullish_points", "bearish_points", "sources", "follow_up_questions"]:
        if not result.get(field):
            result[field] = ["Analysis based on available live data"]
    return result
