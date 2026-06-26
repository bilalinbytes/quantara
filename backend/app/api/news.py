from fastapi import APIRouter, HTTPException
from app.schemas.news import CompanyNewsResponse, ErrorResponse, SentimentResponse, NewsAnalysisResponse
from app.services.news_service import NewsService

router = APIRouter()
news_service = NewsService()

@router.get("/companies/{ticker}/news", response_model=CompanyNewsResponse, responses={500: {"model": ErrorResponse}})
async def get_company_news(ticker: str):
    news = await news_service.get_company_news(ticker)
    if news is None:
        raise HTTPException(status_code=500, detail={"error": "Failed to fetch news data from provider", "details": "The upstream API may be down or the API key is invalid."})
    return news

@router.get("/companies/{ticker}/sentiment", response_model=SentimentResponse)
async def get_company_sentiment(ticker: str):
    return await news_service.get_company_sentiment(ticker)

@router.post("/companies/{ticker}/news/analyze", response_model=NewsAnalysisResponse)
async def analyze_company_news(ticker: str):
    return await news_service.analyze_company_news(ticker)
