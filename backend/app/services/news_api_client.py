"""NewsAPI.org client for live company news (FMP news fallback)."""
import logging
from typing import Any, Dict, List, Optional

import httpx

from app.config.settings import settings
from app.services.cache_service import cache_get, cache_set

logger = logging.getLogger("news_api")

NEWSAPI_BASE = "https://newsapi.org/v2"


def news_api_ok() -> bool:
    return bool(settings.news_api_key and settings.news_api_key != "mock")


class NewsAPIClient:
    def __init__(self):
        self.api_key = settings.news_api_key

    async def _get(self, path: str, params: Dict[str, Any]) -> Optional[Dict]:
        if not news_api_ok():
            return None
        params = {**params, "apiKey": self.api_key}
        cache_key = f"newsapi:{path}:{params.get('q', '')}:{params.get('pageSize', '')}"
        cached = await cache_get(cache_key)
        if cached is not None:
            return cached
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                r = await client.get(f"{NEWSAPI_BASE}{path}", params=params)
                r.raise_for_status()
                data = r.json()
                if data.get("status") == "ok":
                    await cache_set(cache_key, data)
                    return data
        except Exception as e:
            logger.warning(f"NewsAPI {path} failed: {e}")
        return None

    async def get_company_news(self, ticker: str, company_name: str = "", limit: int = 20) -> List[Dict]:
        query = f"{ticker} OR {company_name}".strip(" OR ") if company_name else ticker
        data = await self._get("/everything", {
            "q": query,
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": min(limit, 100),
        })
        if not data:
            return []
        articles = []
        for item in data.get("articles", [])[:limit]:
            articles.append({
                "title": item.get("title") or "",
                "text": item.get("description") or item.get("content") or "",
                "site": (item.get("source") or {}).get("name", "NewsAPI"),
                "url": item.get("url") or "",
                "publishedDate": item.get("publishedAt") or "",
                "image": item.get("urlToImage") or "",
            })
        return articles

    async def get_general_market_news(self, limit: int = 10) -> List[Dict]:
        data = await self._get("/top-headlines", {
            "category": "business",
            "language": "en",
            "pageSize": min(limit, 100),
        })
        if not data:
            return []
        return [
            {
                "title": item.get("title") or "",
                "text": item.get("description") or "",
                "site": (item.get("source") or {}).get("name", "NewsAPI"),
                "url": item.get("url") or "",
                "publishedDate": item.get("publishedAt") or "",
                "image": item.get("urlToImage") or "",
            }
            for item in data.get("articles", [])[:limit]
        ]
