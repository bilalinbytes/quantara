from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[3]  # project root (StockPilotAI)
_ENV_FILE = _ROOT / ".env"


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://quantara:password@localhost:5432/quantara_dev"
    redis_url: str = "redis://localhost:6379/0"

    # Market data APIs
    fmp_api_key: str = "mock"
    fmp_base_url: str = "https://financialmodelingprep.com/stable"
    polygon_api_key: str = "mock"
    alpha_vantage_api_key: str = "mock"
    finnhub_api_key: str = "mock"

    # News API (NewsAPI.org — used when FMP news unavailable)
    news_api_key: str = "mock"

    # LLM — Groq (default provider)
    llm_provider: str = "groq"
    groq_api_key: str = "mock"
    groq_model: str = "llama-3.3-70b-versatile"
    groq_fallback_model: str = "llama-3.1-8b-instant"

    # Vector DB
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: Optional[str] = None

    # SEC EDGAR (no key needed, public API)
    sec_user_agent: str = "Quantara/1.0 contact@quantara.ai"

    # Auth
    secret_key: str = "super-secret-quantara-jwt-signing-key-2026"

    # OAuth
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    google_redirect_uri: str = "http://localhost:3000/auth/callback/google"
    github_client_id: Optional[str] = None
    github_client_secret: Optional[str] = None
    github_redirect_uri: str = "http://localhost:3000/auth/callback/github"

    # CORS (comma-separated origins in production)
    cors_origins: str = "*"

    class Config:
        env_file = str(_ENV_FILE)
        env_file_encoding = "utf-8"


settings = Settings()
