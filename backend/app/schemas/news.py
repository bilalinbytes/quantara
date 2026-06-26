from pydantic import BaseModel
from typing import List, Optional, Any


class NewsArticle(BaseModel):
    title: str
    summary: str
    source: str
    url: str
    published_at: str
    image: Optional[str] = None
    sentiment: Optional[str] = None
    category: Optional[str] = None


class CompanyNewsResponse(BaseModel):
    ticker: str
    news: List[NewsArticle]


class SentimentResponse(BaseModel):
    overall_sentiment: str
    confidence: str
    positive_pct: float
    neutral_pct: float
    negative_pct: float
    top_drivers: List[str]
    top_risks: List[str]
    timeline: List[dict]


class NewsAnalysisResponse(BaseModel):
    summary: Optional[str] = None
    executive_summary: Optional[str] = None
    daily_ai_summary: Optional[str] = None
    why_moving: Optional[str] = None
    investment_score: Optional[int] = None
    recommendation: Optional[str] = None
    confidence: Optional[Any] = None
    bullish_points: Optional[List[str]] = None
    bearish_points: Optional[List[str]] = None
    positive_drivers: Optional[List[str]] = None
    negative_drivers: Optional[List[str]] = None
    positive_news: Optional[List[str]] = None
    negative_news: Optional[List[str]] = None
    neutral_news: Optional[List[str]] = None
    catalysts: Optional[List[str]] = None
    important_catalysts: Optional[List[str]] = None
    investor_takeaway: Optional[str] = None
    market_outlook: Optional[str] = None
    market_sentiment: Optional[str] = None
    upcoming_events: Optional[List[str]] = None
    financial_health: Optional[str] = None
    valuation: Optional[str] = None
    price_target: Optional[str] = None
    risks: Optional[List[str]] = None
    latest_news: Optional[List[Any]] = None
    press_releases: Optional[List[Any]] = None
    analyst_ratings_detail: Optional[List[str]] = None
    sources: Optional[List[str]] = None


class ErrorResponse(BaseModel):
    error: str
    details: Optional[str] = None
