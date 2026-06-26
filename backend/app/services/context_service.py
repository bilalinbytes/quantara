"""Shared Company Context Service — single cached source for all AI features."""
import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from app.services.cache_service import cache_get, cache_set, context_cache_key, CACHE_TTL
from app.services.fmp_client import FMPClient, fmp_ok
from app.services.news_api_client import NewsAPIClient, news_api_ok

logger = logging.getLogger("context_service")

# Source labels shown in evidence UI
SOURCE_LABELS = {
    "company_profile": "Company Profile",
    "live_quote": "Live Price",
    "historical_prices": "Historical Prices",
    "latest_news": "Latest News",
    "general_market_news": "General Market News",
    "press_releases": "Press Releases",
    "income_statement": "Income Statement",
    "balance_sheet": "Balance Sheet",
    "cash_flow": "Cash Flow Statement",
    "financial_ratios": "Financial Ratios",
    "key_metrics": "Key Metrics",
    "analyst_ratings": "Analyst Ratings",
    "price_targets": "Price Targets",
    "analyst_estimates": "Analyst Estimates",
    "sec_filings": "SEC Filings",
    "sec_sections": "SEC Filing Sections",
    "technical_indicators": "Technical Indicators",
}

CONFIDENCE_BY_COUNT = {8: 95, 7: 88, 6: 82, 5: 74, 4: 65, 3: 58, 2: 48, 1: 35}


def compute_confidence(source_count: int) -> int:
    if source_count >= 8:
        return 95
    return CONFIDENCE_BY_COUNT.get(source_count, 0)


def _has_data(key: str, val: Any) -> bool:
    if val is None:
        return False
    if isinstance(val, Exception):
        return False
    if isinstance(val, list):
        return len(val) > 0
    if isinstance(val, dict):
        return len(val) > 0
    return bool(val)


def _normalize_news(raw: Optional[List], label: str = "News") -> List[Dict]:
    if not raw:
        return []
    items = []
    for item in raw[:15]:
        if not isinstance(item, dict):
            continue
        items.append({
            "title": item.get("title") or item.get("headline") or "Untitled",
            "summary": (item.get("text") or item.get("description") or item.get("content") or "")[:500],
            "source": item.get("site") or item.get("source") or label,
            "url": item.get("url") or item.get("link") or "",
            "published_at": item.get("publishedDate") or item.get("published_at") or item.get("date") or "",
        })
    return items


def _compute_technicals(historical: Any, quote: Any) -> Optional[Dict]:
    rows = []
    if isinstance(historical, list):
        rows = historical
    elif isinstance(historical, dict):
        rows = historical.get("historical") or historical.get("data") or []

    closes: List[float] = []
    for row in rows[-252:]:
        if isinstance(row, dict):
            c = row.get("close") or row.get("price")
            if c is not None:
                try:
                    closes.append(float(c))
                except (TypeError, ValueError):
                    pass

    if len(closes) < 5:
        q = (quote or [{}])[0] if isinstance(quote, list) else (quote or {})
        price = q.get("price")
        if price is None:
            return None
        return {
            "current_price": price,
            "note": "Limited history — basic quote-only technical snapshot",
            "day_change_pct": q.get("changesPercentage") or q.get("change_1d"),
        }

    def sma(n: int) -> float:
        window = closes[-n:]
        return round(sum(window) / len(window), 2)

    sma20 = sma(min(20, len(closes)))
    sma50 = sma(min(50, len(closes))) if len(closes) >= 50 else None
    pct_1m = round((closes[-1] / closes[-min(22, len(closes))] - 1) * 100, 2) if len(closes) >= 22 else None
    pct_3m = round((closes[-1] / closes[-min(66, len(closes))] - 1) * 100, 2) if len(closes) >= 66 else None

    q0 = (quote or [{}])[0] if isinstance(quote, list) else {}
    return {
        "current_price": closes[-1],
        "sma_20": sma20,
        "sma_50": sma50,
        "trend": "Bullish" if sma50 and sma20 > sma50 else ("Bearish" if sma50 and sma20 < sma50 else "Neutral"),
        "pct_change_1m": pct_1m,
        "pct_change_3m": pct_3m,
        "high_52w": q0.get("yearHigh") or max(closes),
        "low_52w": q0.get("yearLow") or min(closes),
    }


async def _fetch_yahoo_fallback(ticker: str) -> Dict[str, Any]:
    from app.services.market_data import _profile_yahoo, _price_yahoo, _history_yahoo
    profile, price, history = await asyncio.gather(
        _profile_yahoo(ticker),
        _price_yahoo(ticker),
        _history_yahoo(ticker, "1Y"),
        return_exceptions=True,
    )
    out: Dict[str, Any] = {}
    if _has_data("p", profile):
        out["company_profile"] = [profile]
    if _has_data("p", price):
        out["live_quote"] = [{
            "price": price.get("price"),
            "changesPercentage": price.get("change_1d"),
            "volume": price.get("volume"),
            "dayHigh": price.get("high"),
            "dayLow": price.get("low"),
            "yearHigh": price.get("high_52"),
            "yearLow": price.get("low_52"),
            "source": "Yahoo Finance",
        }]
    if _has_data("h", history):
        out["historical_prices"] = history.get("data", [])
    return out


async def _fetch_sec_sections(ticker: str) -> Tuple[Optional[List], Optional[Dict]]:
    try:
        from app.services.sec_service import SecService
        filings_data = await SecService.get_filings(ticker)
        filings = filings_data.get("filings") or []
        if not filings:
            return None, None
        latest = filings[0]
        parsed = await SecService.get_parsed_filing(ticker, latest["id"])
        filing_list = [{
            "type": latest.get("type"),
            "date": latest.get("date"),
            "id": latest.get("id"),
        }]
        priority_keywords = ["risk factor", "management", "business", "md&a", "discussion"]
        sections: Dict[str, str] = {}
        for sec in parsed.get("sections", []):
            title = sec.get("title", "")
            tl = title.lower()
            if any(kw in tl for kw in priority_keywords):
                sections[title] = (sec.get("content") or "")[:3500]
        return filing_list, sections if sections else None
    except Exception as e:
        logger.warning(f"SEC sections fetch failed for {ticker}: {e}")
        return None, None


async def fetch_company_context(ticker: str, force_refresh: bool = False) -> Dict[str, Any]:
    """
    Fetch all data sources in parallel. Every source is optional.
    Returns unified cached bundle used by chat, news, research, financials.
    """
    t = ticker.upper()
    cache_key = context_cache_key(t)
    if not force_refresh:
        cached = await cache_get(cache_key)
        if cached:
            return cached

    fmp = FMPClient()
    news_api = NewsAPIClient()

    async def _fmp(name: str, coro):
        try:
            return name, await coro
        except Exception as e:
            logger.warning(f"FMP {name} failed: {e}")
            return name, None

    fmp_tasks = []
    if fmp_ok():
        fmp_tasks = [
            _fmp("company_profile", fmp.get_profile(t)),
            _fmp("live_quote", fmp.get_quote(t)),
            _fmp("historical_prices", fmp.get_historical_prices(t)),
            _fmp("income_statement", fmp.get_income_statement(t)),
            _fmp("balance_sheet", fmp.get_balance_sheet(t)),
            _fmp("cash_flow", fmp.get_cash_flow(t)),
            _fmp("financial_ratios", fmp.get_ratios(t)),
            _fmp("key_metrics", fmp.get_key_metrics(t)),
            _fmp("press_releases", fmp.get_press_releases(t)),
            _fmp("general_market_news", fmp.get_general_news(10)),
            _fmp("analyst_ratings", fmp.get_ratings(t)),
            _fmp("price_targets", fmp.get_price_target(t)),
            _fmp("analyst_estimates", fmp.get_analyst_estimates(t)),
            _fmp("sec_filings", fmp.get_sec_filings(t)),
            _fmp("fmp_stock_news", fmp.get_stock_news(t)),
        ]

    sec_task = _fetch_sec_sections(t)
    news_task = None
    if news_api_ok():
        news_task = news_api.get_company_news(t, limit=20)

    yahoo_task = _fetch_yahoo_fallback(t)

    parallel = [asyncio.gather(*fmp_tasks), sec_task, yahoo_task]
    if news_task:
        parallel.append(news_task)

    results = await asyncio.gather(*parallel, return_exceptions=True)

    raw: Dict[str, Any] = {k: None for k in SOURCE_LABELS}
    fmp_results = results[0] if not isinstance(results[0], Exception) else []
    if isinstance(fmp_results, list):
        for item in fmp_results:
            if isinstance(item, tuple):
                raw[item[0]] = item[1]

    sec_result = results[1] if len(results) > 1 and not isinstance(results[1], Exception) else (None, None)
    if isinstance(sec_result, tuple):
        raw["sec_filings"] = raw.get("sec_filings") or sec_result[0]
        raw["sec_sections"] = sec_result[1]

    yahoo = results[2] if len(results) > 2 and not isinstance(results[2], Exception) else {}
    if isinstance(yahoo, dict):
        for k, v in yahoo.items():
            if not _has_data(k, raw.get(k)) and _has_data(k, v):
                raw[k] = v

    news_raw = results[3] if len(results) > 3 and not isinstance(results[3], Exception) else []
    if not news_raw:
        news_raw = raw.pop("fmp_stock_news", None) or []
    raw["latest_news"] = _normalize_news(news_raw, "NewsAPI")
    raw.pop("fmp_stock_news", None)

    if not _has_data("press_releases", raw.get("press_releases")):
        raw["press_releases"] = []
    else:
        raw["press_releases"] = _normalize_news(raw["press_releases"], "Press Release")

    if not _has_data("general_market_news", raw.get("general_market_news")):
        if news_api_ok():
            general = await news_api.get_general_market_news(8)
            raw["general_market_news"] = _normalize_news(general, "Market News")
    else:
        raw["general_market_news"] = _normalize_news(raw["general_market_news"], "Market News")

    profile = (raw.get("company_profile") or [{}])[0] if isinstance(raw.get("company_profile"), list) else {}
    if isinstance(profile, dict) and not profile.get("companyName"):
        profile = {**profile, "companyName": profile.get("name") or t}
    raw["technical_indicators"] = _compute_technicals(raw.get("historical_prices"), raw.get("live_quote"))

    sources_used: List[str] = []
    missing_sources: List[str] = []
    for key, label in SOURCE_LABELS.items():
        if _has_data(key, raw.get(key)):
            sources_used.append(label)
        else:
            missing_sources.append(label)
            raw[key] = None

    source_count = len(sources_used)
    confidence = compute_confidence(source_count)

    company_name = ""
    if isinstance(profile, dict):
        company_name = profile.get("companyName") or profile.get("name") or t

    bundle = {
        "ticker": t,
        "company_name": company_name,
        "data": raw,
        "sources_used": sources_used,
        "missing_sources": missing_sources,
        "source_count": source_count,
        "confidence": confidence,
        "evidence": [{"label": label, "available": True} for label in sources_used]
        + [{"label": label, "available": False} for label in missing_sources],
    }

    if source_count > 0:
        await cache_set(cache_key, bundle, CACHE_TTL)

    return bundle


def build_context_prompt(bundle: Dict[str, Any], question: str, history: Optional[List] = None) -> str:
    """Build prompt from whatever sources succeeded — skip missing sections entirely."""
    data = bundle.get("data") or {}
    sections: List[str] = []

    profile = (data.get("company_profile") or [{}])[0] if data.get("company_profile") else {}
    if profile:
        sections.append(f"## Company\n{json.dumps(profile, default=str)[:2500]}")

    quote = (data.get("live_quote") or [{}])[0] if data.get("live_quote") else {}
    if quote:
        sections.append(
            f"## Current Price\nPrice: {quote.get('price')} | Change: {quote.get('changesPercentage')}% "
            f"| Market Cap: {profile.get('mktCap') or profile.get('market_cap', 'N/A')}\n"
            f"{json.dumps(quote, default=str)[:1200]}"
        )

    if data.get("latest_news"):
        sections.append(f"## Latest News\n{json.dumps(data['latest_news'][:10], default=str)[:4000]}")

    if data.get("general_market_news"):
        sections.append(f"## General Market News\n{json.dumps(data['general_market_news'][:6], default=str)[:2000]}")

    if data.get("press_releases"):
        sections.append(f"## Press Releases\n{json.dumps(data['press_releases'][:8], default=str)[:2500]}")

    if data.get("sec_sections"):
        sections.append(f"## SEC Filing Highlights (Risk Factors / MD&A / Business)\n{json.dumps(data['sec_sections'], default=str)[:5000]}")
    elif data.get("sec_filings"):
        sections.append(f"## SEC Filings Metadata\n{json.dumps(data['sec_filings'][:5], default=str)[:2000]}")

    fin_parts = []
    if data.get("income_statement"):
        fin_parts.append(f"Income: {json.dumps(data['income_statement'][:2], default=str)[:1500]}")
    if data.get("balance_sheet"):
        fin_parts.append(f"Balance Sheet: {json.dumps(data['balance_sheet'][:2], default=str)[:1500]}")
    if data.get("cash_flow"):
        fin_parts.append(f"Cash Flow: {json.dumps(data['cash_flow'][:2], default=str)[:1500]}")
    if fin_parts:
        sections.append("## Financial Statements\n" + "\n".join(fin_parts))

    if data.get("financial_ratios"):
        sections.append(f"## Financial Ratios\n{json.dumps(data['financial_ratios'][:3], default=str)[:2000]}")
    if data.get("key_metrics"):
        sections.append(f"## Key Metrics\n{json.dumps(data['key_metrics'][:3], default=str)[:2000]}")

    if data.get("analyst_ratings"):
        sections.append(f"## Analyst Ratings\n{json.dumps(data['analyst_ratings'][:8], default=str)[:1500]}")
    if data.get("price_targets"):
        sections.append(f"## Price Targets\n{json.dumps(data['price_targets'], default=str)[:1000]}")
    if data.get("analyst_estimates"):
        sections.append(f"## Analyst Estimates\n{json.dumps(data['analyst_estimates'][:3], default=str)[:1500]}")

    if data.get("historical_prices"):
        hist = data["historical_prices"]
        if isinstance(hist, list) and len(hist) > 5:
            sections.append(f"## Historical Price Trend (last 10 days)\n{json.dumps(hist[-10:], default=str)[:1500]}")

    if data.get("technical_indicators"):
        sections.append(f"## Technical Indicators\n{json.dumps(data['technical_indicators'], default=str)[:1200]}")

    sections.append(
        f"## Data Coverage\nSources available ({bundle.get('source_count', 0)}): "
        f"{', '.join(bundle.get('sources_used', []))}\n"
        f"Sources unavailable: {', '.join(bundle.get('missing_sources', [])) or 'none'}\n"
        f"System confidence from evidence: {bundle.get('confidence')}%"
    )

    if history:
        recent = history[-8:]
        hist_str = "\n".join(f"{m['role'].upper()}: {m['content'][:350]}" for m in recent)
        sections.append(f"## Conversation History\n{hist_str}")

    sections.append(f"## User Question\n{question}")
    return "\n\n".join(sections)
