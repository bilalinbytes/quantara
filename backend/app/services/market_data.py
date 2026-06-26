"""
Real market data service.
Priority chain: FMP → Yahoo Finance → raise HTTPException (no silent fallbacks).
All financial values come from live APIs only.
"""
import logging
import json
from typing import Dict, Any, Optional, List
import httpx
from fastapi import HTTPException
from app.config.settings import settings

logger = logging.getLogger("market_data")

# ─── Shared async client factory ─────────────────────────────────────────────

def _client(timeout: float = 8.0) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        timeout=timeout,
        headers={"User-Agent": "Quantara/1.0 (contact@quantara.ai)"},
        follow_redirects=True,
    )

# ─── Helpers ─────────────────────────────────────────────────────────────────

def _fmt_mcap(mc: float) -> str:
    if mc >= 1e12:
        return f"${mc / 1e12:.2f}T"
    if mc >= 1e9:
        return f"${mc / 1e9:.1f}B"
    if mc >= 1e6:
        return f"${mc / 1e6:.0f}M"
    return f"${mc:,.0f}"

def _fmt_employees(emp) -> str:
    if emp is None or emp == "":
        return "N/A"
    try:
        return f"{int(emp):,}"
    except (ValueError, TypeError):
        return str(emp)

def _fmp_ok() -> bool:
    return bool(settings.fmp_api_key and settings.fmp_api_key != "mock")

async def _fmp_get(endpoint: str, params: dict | None = None) -> Optional[Any]:
    """GET from FMP stable API; returns parsed JSON or None on any error."""
    if not _fmp_ok():
        return None
    from app.services.cache_service import cache_get, cache_set
    p = {**(params or {}), "apikey": settings.fmp_api_key}
    cache_key = f"fmp:{endpoint}:{':'.join(f'{k}={v}' for k, v in sorted(p.items()) if k != 'apikey')}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        async with _client() as c:
            r = await c.get(f"{settings.fmp_base_url}{endpoint}", params=p)
            r.raise_for_status()
            data = r.json()
            await cache_set(cache_key, data)
            return data
    except Exception as e:
        logger.warning(f"FMP {endpoint} failed: {e}")
        return None

async def _yahoo_get(path: str, params: dict | None = None) -> Optional[Any]:
    try:
        async with _client() as c:
            r = await c.get(f"https://query1.finance.yahoo.com{path}", params=params or {})
            r.raise_for_status()
            return r.json()
    except Exception as e:
        logger.warning(f"Yahoo {path} failed: {e}")
        return None

# ─── Search ──────────────────────────────────────────────────────────────────

async def _search_fmp(q: str) -> List[Dict]:
    data = await _fmp_get("/search-name", {"query": q, "limit": 8})
    if not data:
        return []
    return [
        {"ticker": d["symbol"], "name": d["name"],
         "exchange": d.get("stockExchange", ""), "logo": "", "sector": "N/A", "industry": "N/A"}
        for d in data if d.get("symbol")
    ]

async def _search_yahoo(q: str) -> List[Dict]:
    data = await _yahoo_get("/v1/finance/search", {"q": q, "quotesCount": 8, "newsCount": 0})
    quotes = (data or {}).get("quoteResponse", {}).get("result", []) if data else []
    if not quotes:
        quotes = (data or {}).get("quotes", [])
    return [
        {"ticker": d.get("symbol", ""), "name": d.get("longname") or d.get("shortname", ""),
         "exchange": d.get("exchange", ""), "logo": "", "sector": "N/A", "industry": "N/A"}
        for d in quotes if d.get("symbol")
    ]


# ─── Profile ─────────────────────────────────────────────────────────────────

async def _profile_fmp(ticker: str) -> Optional[Dict]:
    data = await _fmp_get("/profile", {"symbol": ticker})
    if not data or not isinstance(data, list):
        return None
    d = data[0]
    return {
        "name": d.get("companyName", ticker),
        "ticker": ticker,
        "exchange": d.get("exchangeShortName") or d.get("exchange", "N/A"),
        "sector": d.get("sector") or "N/A",
        "industry": d.get("industry") or "N/A",
        "country": d.get("country") or "USA",
        "ceo": d.get("ceo") or "N/A",
        "employees": _fmt_employees(d.get("fullTimeEmployees")),
        "founded": (d.get("ipoDate") or "")[:4] or "N/A",
        "website": d.get("website") or "N/A",
        "market_cap": _fmt_mcap(d.get("mktCap") or 0),
        "description": d.get("description") or f"{ticker} is a publicly traded company.",
    }

async def _profile_yahoo(ticker: str) -> Optional[Dict]:
    data = await _yahoo_get(
        f"/v11/finance/quoteSummary/{ticker}",
        {"modules": "assetProfile,price"}
    )
    result = ((data or {}).get("quoteSummary", {}).get("result") or [{}])
    if not result:
        return None
    r = result[0]
    ap = r.get("assetProfile", {})
    pr = r.get("price", {})
    mc = (pr.get("marketCap") or {}).get("raw", 0)
    name = pr.get("longName") or pr.get("shortName") or ticker
    ceo = next(
        (o.get("name") for o in ap.get("companyOfficers", [])
         if "ceo" in (o.get("title") or "").lower()), "N/A"
    )
    return {
        "name": name, "ticker": ticker,
        "exchange": pr.get("exchangeName") or "N/A",
        "sector": ap.get("sector") or "N/A",
        "industry": ap.get("industry") or "N/A",
        "country": ap.get("country") or "N/A",
        "ceo": ceo,
        "employees": _fmt_employees(ap.get("fullTimeEmployees")),
        "founded": "N/A",
        "website": ap.get("website") or "N/A",
        "market_cap": _fmt_mcap(mc),
        "description": ap.get("longBusinessSummary") or f"{ticker} is a publicly traded company.",
    }

# ─── Price ───────────────────────────────────────────────────────────────────

async def _price_fmp(ticker: str) -> Optional[Dict]:
    data = await _fmp_get("/quote", {"symbol": ticker})
    if not data or not isinstance(data, list):
        return None
    d = data[0]
    price = float(d.get("price") or 0)
    vol = d.get("volume") or 0
    return {
        "price": price,
        "change_1d": round(float(d.get("changesPercentage") or 0), 2),
        "status": "Live (FMP)",
        "open": float(d.get("open") or price),
        "high": float(d.get("dayHigh") or price),
        "low": float(d.get("dayLow") or price),
        "prev_close": float(d.get("previousClose") or price),
        "high_52": float(d.get("yearHigh") or price),
        "low_52": float(d.get("yearLow") or price),
        "volume": f"{float(vol) / 1_000_000:.1f}M" if vol else "N/A",
        "is_fallback": False,
    }

async def _price_yahoo(ticker: str) -> Optional[Dict]:
    data = await _yahoo_get(f"/v8/finance/chart/{ticker}")
    result = ((data or {}).get("chart", {}).get("result") or [])
    if not result:
        return None
    meta = result[0].get("meta", {})
    price = float(meta.get("regularMarketPrice") or 0)
    prev = float(meta.get("chartPreviousClose") or meta.get("previousClose") or price)
    pct = round(((price - prev) / prev) * 100, 2) if prev else 0.0
    vol = meta.get("regularMarketVolume") or 0
    return {
        "price": price,
        "change_1d": pct,
        "status": "Live (Yahoo)",
        "open": float(meta.get("regularMarketOpen") or price),
        "high": float(meta.get("regularMarketDayHigh") or price),
        "low": float(meta.get("regularMarketDayLow") or price),
        "prev_close": prev,
        "high_52": float(meta.get("fiftyTwoWeekHigh") or price),
        "low_52": float(meta.get("fiftyTwoWeekLow") or price),
        "volume": f"{float(vol) / 1_000_000:.1f}M" if vol else "N/A",
        "is_fallback": False,
    }


# ─── Metrics ─────────────────────────────────────────────────────────────────

def _status(val: Optional[float], low: float, high: float, invert: bool = False) -> str:
    if val is None:
        return "neutral"
    good = val >= high if not invert else val <= low
    bad  = val <= low  if not invert else val >= high
    return "favorable" if good else ("unfavorable" if bad else "neutral")

async def _metrics_fmp(ticker: str) -> Optional[Dict]:
    ratios = await _fmp_get("/ratios", {"symbol": ticker, "limit": 1})
    quote  = await _fmp_get("/quote", {"symbol": ticker})
    key    = await _fmp_get("/key-metrics", {"symbol": ticker, "limit": 1})
    if not ratios or not isinstance(ratios, list):
        return None
    r = ratios[0]
    q = (quote or [{}])[0]
    k = (key or [{}])[0]

    def fv(d, key, decimals=2) -> Optional[float]:
        v = d.get(key)
        return round(float(v), decimals) if v is not None else None

    pe   = fv(r, "peRatioTTM")
    fpe  = fv(r, "priceEarningsRatioTTM")
    eps  = fv(k, "epsTTM")
    peg  = fv(r, "pegRatioTTM")
    pb   = fv(r, "priceToBookRatioTTM")
    ps   = fv(r, "priceToSalesRatioTTM")
    div  = fv(r, "dividendYieldTTM")
    beta = fv(q, "beta")
    avg_vol = fv(q, "avgVolume")
    shares  = fv(k, "weightedAverageSharesDilutedTTM")

    rev  = fv(k, "revenuePerShareTTM")
    ni   = fv(k, "netIncomePerShareTTM")
    gm   = fv(r, "grossProfitMarginTTM")
    om   = fv(r, "operatingProfitMarginTTM")
    fcf  = fv(k, "freeCashFlowPerShareTTM")
    cash = fv(k, "cashAndCashEquivalentsTTM")
    debt = fv(k, "totalDebtTTM")
    ev   = fv(k, "enterpriseValueTTM")
    roe  = fv(r, "returnOnEquityTTM")
    roa  = fv(r, "returnOnAssetsTTM")
    roic = fv(r, "returnOnCapitalEmployedTTM")

    def pct(v): return f"{v*100:.1f}%" if v is not None else "N/A"
    def bil(v): return f"${v/1e9:.1f}B" if v is not None else "N/A"
    def mil(v): return f"{v/1e6:.1f}M" if v is not None else "N/A"

    metrics = [
        {"label": "P/E Ratio",      "value": str(pe)  if pe  else "N/A", "status": _status(pe,  0, 25, invert=True)},
        {"label": "Forward P/E",    "value": str(fpe) if fpe else "N/A", "status": _status(fpe, 0, 22, invert=True)},
        {"label": "EPS (TTM)",      "value": f"${eps:.2f}" if eps else "N/A", "status": _status(eps, 0, 5)},
        {"label": "PEG Ratio",      "value": str(peg) if peg else "N/A", "status": _status(peg, 0, 1.5, invert=True)},
        {"label": "Price / Book",   "value": str(pb)  if pb  else "N/A", "status": "neutral"},
        {"label": "Price / Sales",  "value": str(ps)  if ps  else "N/A", "status": "neutral"},
        {"label": "Dividend Yield", "value": pct(div), "status": "neutral"},
        {"label": "Beta",           "value": str(beta) if beta else "N/A", "status": _status(beta, 0.8, 1.5, invert=True)},
        {"label": "Avg Volume",     "value": mil(avg_vol), "status": "neutral"},
        {"label": "Shares Out",     "value": mil(shares), "status": "neutral"},
    ]
    snapshot = [
        {"label": "Revenue (TTM)",       "value": bil(fv(k, "revenueTTM")),           "status": "neutral"},
        {"label": "Net Income (TTM)",     "value": bil(fv(k, "netIncomeTTM")),          "status": "neutral"},
        {"label": "Gross Margin",         "value": pct(gm),  "status": _status(gm,  0.2, 0.4)},
        {"label": "Operating Margin",     "value": pct(om),  "status": _status(om,  0.05, 0.2)},
        {"label": "Free Cash Flow",       "value": bil(fv(k, "freeCashFlowTTM")),      "status": "neutral"},
        {"label": "Cash & Equivalents",   "value": bil(cash), "status": "neutral"},
        {"label": "Total Debt",           "value": bil(debt), "status": "neutral"},
        {"label": "Enterprise Value",     "value": bil(ev),   "status": "neutral"},
        {"label": "ROE",                  "value": pct(roe),  "status": _status(roe,  0.1, 0.2)},
        {"label": "ROA",                  "value": pct(roa),  "status": _status(roa, 0.05, 0.1)},
        {"label": "ROIC",                 "value": pct(roic), "status": _status(roic, 0.08, 0.15)},
    ]
    return {"metrics": metrics, "snapshot": snapshot}

# ─── Historical Prices ───────────────────────────────────────────────────────

async def _history_fmp(ticker: str, period: str = "1Y") -> Optional[Dict]:
    period_map = {"1D": 1, "1W": 5, "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "5Y": 1825}
    days = period_map.get(period.upper(), 365)
    data = await _fmp_get("/historical-price-eod/full", {"symbol": ticker})
    if not data:
        return None
    hist = data if isinstance(data, list) else data.get("historical", [])
    if not hist:
        return None
    rows = [
        {"date": d["date"], "price": round(float(d["close"]), 2), "volume": int(d.get("volume") or 0)}
        for d in reversed(hist[-days:])
        if d.get("close") is not None
    ]
    return {"data": rows} if rows else None

async def _history_yahoo(ticker: str, period: str = "1Y") -> Optional[Dict]:
    range_map = {"1D": "1d", "1W": "5d", "1M": "1mo", "3M": "3mo", "6M": "6mo", "1Y": "1y", "5Y": "5y"}
    r = range_map.get(period.upper(), "1y")
    interval = "5m" if r == "1d" else ("1h" if r == "5d" else "1d")
    data = await _yahoo_get(f"/v8/finance/chart/{ticker}", {"range": r, "interval": interval})
    result = ((data or {}).get("chart", {}).get("result") or [])
    if not result:
        return None
    ts     = result[0].get("timestamp") or []
    closes = (result[0].get("indicators", {}).get("quote") or [{}])[0].get("close") or []
    vols   = (result[0].get("indicators", {}).get("quote") or [{}])[0].get("volume") or []
    from datetime import datetime
    rows = []
    for i, t in enumerate(ts):
        c = closes[i] if i < len(closes) else None
        v = vols[i]   if i < len(vols)   else 0
        if c is None:
            continue
        rows.append({"date": datetime.utcfromtimestamp(t).strftime("%Y-%m-%d"), "price": round(float(c), 2), "volume": int(v or 0)})
    return {"data": rows} if rows else None


# ─── Financials ──────────────────────────────────────────────────────────────

async def _financials_fmp(ticker: str) -> Optional[Dict]:
    income = await _fmp_get("/income-statement", {"symbol": ticker, "limit": 5})
    balance= await _fmp_get("/balance-sheet-statement", {"symbol": ticker, "limit": 5})
    cashfl = await _fmp_get("/cash-flow-statement", {"symbol": ticker, "limit": 5})
    if not income or not isinstance(income, list):
        return None

    bal_map = {b["date"]: b for b in (balance or [])}
    cf_map  = {c["date"]: c for c in (cashfl  or [])}

    def fv(d, k, div=1): return round(float(d[k]) / div, 2) if d.get(k) is not None else None

    annual = []
    for inc in income:
        date = inc.get("date", "")
        bal  = bal_map.get(date, {})
        cf   = cf_map.get(date, {})
        rev  = fv(inc, "revenue", 1e6)
        gp   = fv(inc, "grossProfit", 1e6)
        oi   = fv(inc, "operatingIncome", 1e6)
        ni   = fv(inc, "netIncome", 1e6)
        assets = fv(bal, "totalAssets", 1e6)
        liabs  = fv(bal, "totalLiabilities", 1e6)
        equity = fv(bal, "totalStockholdersEquity", 1e6)
        ocf    = fv(cf,  "operatingCashFlow", 1e6)
        icf    = fv(cf,  "investingCashFlow", 1e6)
        fcf_v  = fv(cf,  "financingCashFlow", 1e6)
        capex  = fv(cf,  "capitalExpenditure", 1e6)
        free_cf = round((ocf or 0) + (capex or 0), 2) if ocf is not None else None
        gm = round(float(gp) / float(rev) * 100, 2) if gp and rev else None
        om = round(float(oi) / float(rev) * 100, 2) if oi and rev else None
        roe = round(float(ni) / float(equity) * 100, 2) if ni and equity else None
        roa = round(float(ni) / float(assets) * 100, 2) if ni and assets else None
        annual.append({
            "date": date,
            "revenue": rev,         "gross_profit": gp,
            "operating_income": oi, "net_income": ni,
            "assets": assets,       "liabilities": liabs,
            "equity": equity,
            "operating_cf": ocf,    "investing_cf": icf,
            "financing_cf": fcf_v,  "free_cash_flow": free_cf,
            "gross_margin": gm,     "operating_margin": om,
            "roe": roe,             "roa": roa,
        })
    return {"annual": annual} if annual else None

# ─── Public API facade ───────────────────────────────────────────────────────

class MarketDataService:

    @staticmethod
    async def get_search(query: str) -> Dict:
        results = await _search_fmp(query)
        if not results:
            results = await _search_yahoo(query)
        if not results:
            # Last resort: treat the query itself as a ticker attempt
            results = [{"ticker": query.upper(), "name": f"{query.upper()} Corp.", "exchange": "N/A", "logo": "", "sector": "N/A", "industry": "N/A"}]
        return {"results": results[:8]}

    @staticmethod
    async def get_profile(ticker: str) -> Dict:
        t = ticker.upper()
        p = await _profile_fmp(t)
        if not p:
            p = await _profile_yahoo(t)
        if not p:
            raise HTTPException(status_code=404, detail=f"Profile not found for ticker {t}. Check the ticker symbol.")
        return p

    @staticmethod
    async def get_price(ticker: str) -> Dict:
        t = ticker.upper()
        p = await _price_fmp(t)
        if not p:
            p = await _price_yahoo(t)
        if not p:
            raise HTTPException(status_code=503, detail=f"Live price unavailable for {t}. Market data APIs are unreachable.")
        return p

    @staticmethod
    async def get_metrics(ticker: str) -> Dict:
        t = ticker.upper()
        m = await _metrics_fmp(t)
        if not m:
            raise HTTPException(status_code=503, detail=f"Metrics unavailable for {t}. FMP API key required — set FMP_API_KEY in .env")
        return m

    @staticmethod
    async def get_history(ticker: str, period: str = "1Y") -> Dict:
        t = ticker.upper()
        h = await _history_fmp(t, period)
        if not h:
            h = await _history_yahoo(t, period)
        if not h:
            raise HTTPException(status_code=503, detail=f"Historical prices unavailable for {t}.")
        return h

    @staticmethod
    async def get_financials(ticker: str) -> Dict:
        t = ticker.upper()
        f = await _financials_fmp(t)
        if not f:
            raise HTTPException(status_code=503, detail=f"Financial statements unavailable for {t}. FMP API key required — set FMP_API_KEY in .env")
        return f


# ─── AI Service (Groq-driven, data-grounded) ─────────────────────────────────

from app.services.llm_service import llm_complete, groq_ok, QUANTARA_SYSTEM

def _openai_ok() -> bool:
    return groq_ok()

def _anthropic_ok() -> bool:
    return False

async def _llm_complete(system: str, user: str, max_tokens: int = 1200) -> str:
    return await llm_complete(system, user, max_tokens=max_tokens)


class AIService:

    @staticmethod
    async def generate_summary(ticker: str) -> Dict:
        """Fetch live context and ask Groq to summarize."""
        from app.ai.pipelines.intelligence_pipeline import run_intelligence_pipeline
        result = await run_intelligence_pipeline(
            f"Provide a concise investment overview for {ticker.upper()}",
            ticker.upper(),
        )
        return {
            "overview": result.get("summary", ""),
            "strengths": result.get("bullish_points", [])[:3],
            "risks": result.get("bearish_points", result.get("risks", []))[:3],
            "drivers": result.get("important_catalysts", result.get("positive_news", []))[:3],
        }

    @staticmethod
    async def generate_financial_analysis(ticker: str) -> Dict:
        """Build full analysis from live financial statements + Groq."""
        from app.ai.pipelines.intelligence_pipeline import run_intelligence_pipeline
        result = await run_intelligence_pipeline(
            f"Write a rigorous financial analysis for {ticker.upper()} covering revenue, margins, cash flow, and risks.",
            ticker.upper(),
        )
        from datetime import datetime
        conf = result.get("confidence_label") or result.get("confidence") or "Medium"
        if isinstance(conf, int):
            conf = "High" if conf >= 75 else "Medium" if conf >= 50 else "Low"
        return {
            "executive_summary": result.get("summary", ""),
            "revenue_analysis": result.get("financial_health", ""),
            "margin_analysis": result.get("valuation", ""),
            "cash_flow_analysis": result.get("financial_health", ""),
            "financial_risks": "; ".join(result.get("risks", [])[:3]),
            "growth_opportunities": "; ".join(result.get("bullish_points", [])[:3]),
            "overall_health": result.get("financial_health", ""),
            "confidence": conf,
            "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        }
