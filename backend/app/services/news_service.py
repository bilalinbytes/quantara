import logging
from typing import Dict, Any, Optional, List

from app.services.context_service import fetch_company_context
from app.schemas.news import NewsArticle, CompanyNewsResponse

logger = logging.getLogger(__name__)


class NewsService:
    """News endpoints backed by the shared Context Service cache."""

    def _articles_from_context(self, ticker: str, bundle: Dict[str, Any]) -> CompanyNewsResponse:
        t = ticker.upper()
        raw = (bundle.get("data") or {}).get("latest_news") or []
        if not raw:
            return CompanyNewsResponse(ticker=t, news=[NewsArticle(
                title="No recent news in cache",
                summary="News will populate on next context refresh.",
                source="Quantara",
                url="",
                published_at="",
                sentiment="Neutral",
                category="General",
            )])

        articles = []
        for item in raw:
            text = (item.get("title", "") + " " + item.get("summary", "")).lower()
            pos_kw = ['beat', 'upgrade', 'record', 'growth', 'surge', 'partnership']
            neg_kw = ['lawsuit', 'downgrade', 'miss', 'decline', 'layoff', 'investigation']
            pos = sum(1 for k in pos_kw if k in text)
            neg = sum(1 for k in neg_kw if k in text)
            sentiment = "Bullish" if pos > neg else ("Bearish" if neg > pos else "Neutral")
            articles.append(NewsArticle(
                title=item.get("title", ""),
                summary=item.get("summary", "")[:500],
                source=item.get("source", ""),
                url=item.get("url", ""),
                published_at=item.get("published_at", ""),
                image=item.get("image", ""),
                sentiment=sentiment,
                category="General",
            ))
        return CompanyNewsResponse(ticker=t, news=articles)

    async def get_company_news(self, ticker: str, limit: int = 20) -> Optional[CompanyNewsResponse]:
        bundle = await fetch_company_context(ticker.upper())
        resp = self._articles_from_context(ticker, bundle)
        resp.news = resp.news[:limit]
        return resp

    async def get_company_sentiment(self, ticker: str) -> Optional[Dict[str, Any]]:
        bundle = await fetch_company_context(ticker.upper())
        news_resp = self._articles_from_context(ticker, bundle)
        articles = news_resp.news
        confidence_pct = bundle.get("confidence", 50)

        if not articles or articles[0].title.startswith("No recent"):
            return {
                "overall_sentiment": "Neutral",
                "confidence": "Low",
                "positive_pct": 33.3,
                "neutral_pct": 33.3,
                "negative_pct": 33.3,
                "top_drivers": ["Awaiting news data refresh"],
                "top_risks": ["Awaiting news data refresh"],
                "timeline": [{"date": "N/A", "event": "News pending"}],
            }

        total = len(articles)
        pos = sum(1 for a in articles if a.sentiment == "Bullish")
        neg = sum(1 for a in articles if a.sentiment == "Bearish")
        neu = total - pos - neg
        pos_pct = round(pos / total * 100, 1)
        neg_pct = round(neg / total * 100, 1)
        neu_pct = round(neu / total * 100, 1)

        if pos_pct > 55:
            overall = "Bullish"
        elif neg_pct > 45:
            overall = "Bearish"
        else:
            overall = "Neutral"

        conf_label = "High" if confidence_pct >= 75 else "Medium" if confidence_pct >= 50 else "Low"

        return {
            "overall_sentiment": overall,
            "confidence": conf_label,
            "positive_pct": pos_pct,
            "neutral_pct": neu_pct,
            "negative_pct": neg_pct,
            "top_drivers": [a.title for a in articles if a.sentiment == "Bullish"][:3] or ["No strongly bullish headlines"],
            "top_risks": [a.title for a in articles if a.sentiment == "Bearish"][:3] or ["No strongly bearish headlines"],
            "timeline": [{"date": a.published_at[:10] if a.published_at else "N/A", "event": a.title[:80]} for a in articles[:3]],
        }

    async def analyze_company_news(self, ticker: str) -> Dict[str, Any]:
        from app.ai.pipelines.intelligence_pipeline import run_intelligence_pipeline
        return await run_intelligence_pipeline(
            question=(
                f"Generate market intelligence for {ticker.upper()}: market summary, "
                "bullish drivers, bearish drivers, catalysts, risks, investor takeaway, "
                "upcoming events, and sentiment."
            ),
            ticker=ticker.upper(),
        )

    async def get_press_releases(self, ticker: str, limit: int = 10) -> List[Dict]:
        bundle = await fetch_company_context(ticker.upper())
        releases = (bundle.get("data") or {}).get("press_releases") or []
        if not releases:
            return [{"title": "Press releases unavailable", "summary": "", "source": "FMP", "url": "", "published_at": ""}]
        return releases[:limit]

    async def get_analyst_ratings(self, ticker: str) -> List[str]:
        bundle = await fetch_company_context(ticker.upper())
        raw = (bundle.get("data") or {}).get("analyst_ratings") or []
        if not raw:
            return ["Analyst ratings unavailable"]
        return [
            f"{r.get('rating', r.get('grade', 'N/A'))} — {r.get('date', '')} ({r.get('gradingCompany', '')})"
            for r in raw[:8] if isinstance(r, dict)
        ]
