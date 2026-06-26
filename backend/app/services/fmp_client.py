"""Financial Modeling Prep client — stable API with concurrent requests + Redis cache."""
import asyncio
import logging
from typing import Any, Dict, List, Optional

import httpx

from app.config.settings import settings
from app.services.cache_service import cache_get, cache_set

logger = logging.getLogger("fmp")


def fmp_ok() -> bool:
    return bool(settings.fmp_api_key and settings.fmp_api_key != "mock")


class FMPClient:
    BASE_URL = settings.fmp_base_url

    def __init__(self):
        self.api_key = settings.fmp_api_key

    async def _request(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Optional[Any]:
        if not fmp_ok():
            return None
        params = {**(params or {}), "apikey": self.api_key}
        cache_key = f"fmp:{endpoint}:{':'.join(f'{k}={v}' for k, v in sorted(params.items()) if k != 'apikey')}"
        cached = await cache_get(cache_key)
        if cached is not None:
            return cached

        url = f"{self.BASE_URL}{endpoint}"
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()
                await cache_set(cache_key, data)
                return data
        except Exception as e:
            logger.warning(f"FMP {endpoint} failed: {e}")
            return None

    async def get_profile(self, ticker: str) -> Optional[List]:
        return await self._request("/profile", {"symbol": ticker.upper()})

    async def get_quote(self, ticker: str) -> Optional[List]:
        return await self._request("/quote", {"symbol": ticker.upper()})

    async def get_historical_prices(self, ticker: str) -> Optional[Any]:
        return await self._request("/historical-price-eod/full", {"symbol": ticker.upper()})

    async def get_income_statement(self, ticker: str, limit: int = 5) -> Optional[List]:
        return await self._request("/income-statement", {"symbol": ticker.upper(), "limit": limit})

    async def get_balance_sheet(self, ticker: str, limit: int = 5) -> Optional[List]:
        return await self._request("/balance-sheet-statement", {"symbol": ticker.upper(), "limit": limit})

    async def get_cash_flow(self, ticker: str, limit: int = 5) -> Optional[List]:
        return await self._request("/cash-flow-statement", {"symbol": ticker.upper(), "limit": limit})

    async def get_ratios(self, ticker: str, limit: int = 5) -> Optional[List]:
        return await self._request("/ratios", {"symbol": ticker.upper(), "limit": limit})

    async def get_key_metrics(self, ticker: str, limit: int = 5) -> Optional[List]:
        return await self._request("/key-metrics", {"symbol": ticker.upper(), "limit": limit})

    async def get_stock_news(self, ticker: str, limit: int = 20) -> Optional[List]:
        return await self._request("/news/stock", {"symbols": ticker.upper(), "limit": limit})

    async def get_press_releases(self, ticker: str, limit: int = 10) -> Optional[List]:
        return await self._request("/news/press-releases", {"symbols": ticker.upper(), "limit": limit})

    async def get_general_news(self, limit: int = 10) -> Optional[List]:
        return await self._request("/news/general", {"limit": limit})

    async def get_ratings(self, ticker: str) -> Optional[List]:
        return await self._request("/ratings", {"symbol": ticker.upper()})

    async def get_price_target(self, ticker: str) -> Optional[List]:
        return await self._request("/price-target-summary", {"symbol": ticker.upper()})

    async def get_analyst_estimates(self, ticker: str, limit: int = 5) -> Optional[List]:
        return await self._request("/analyst-estimates", {"symbol": ticker.upper(), "limit": limit})

    async def get_sec_filings(self, ticker: str, limit: int = 10) -> Optional[List]:
        return await self._request("/sec-filings", {"symbol": ticker.upper(), "limit": limit})

    async def search_name(self, query: str, limit: int = 8) -> Optional[List]:
        return await self._request("/search-name", {"query": query, "limit": limit})

    async def fetch_company_context(self, ticker: str) -> Dict[str, Any]:
        """Fetch all FMP data concurrently for AI context."""
        t = ticker.upper()
        (
            profile,
            quote,
            historical,
            income,
            balance,
            cashflow,
            ratios,
            key_metrics,
            news,
            press_releases,
            ratings,
            price_target,
            analyst_estimates,
            sec_filings,
        ) = await asyncio.gather(
            self.get_profile(t),
            self.get_quote(t),
            self.get_historical_prices(t),
            self.get_income_statement(t),
            self.get_balance_sheet(t),
            self.get_cash_flow(t),
            self.get_ratios(t),
            self.get_key_metrics(t),
            self.get_stock_news(t),
            self.get_press_releases(t),
            self.get_ratings(t),
            self.get_price_target(t),
            self.get_analyst_estimates(t),
            self.get_sec_filings(t),
            return_exceptions=True,
        )

        def _safe(val):
            return val if val is not None and not isinstance(val, Exception) else None

        return {
            "profile": _safe(profile),
            "quote": _safe(quote),
            "historical_prices": _safe(historical),
            "income_statement": _safe(income),
            "balance_sheet": _safe(balance),
            "cash_flow": _safe(cashflow),
            "ratios": _safe(ratios),
            "key_metrics": _safe(key_metrics),
            "stock_news": _safe(news),
            "press_releases": _safe(press_releases),
            "ratings": _safe(ratings),
            "price_target": _safe(price_target),
            "analyst_estimates": _safe(analyst_estimates),
            "sec_filings": _safe(sec_filings),
        }
