from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.api.endpoints import router as api_router
from app.api.news import router as news_router
from app.api.filings import router as filings_router
from app.api.research import router as research_router
from app.api.watchlists import router as watchlists_router
from app.api.auth import router as auth_router
from app.api.exports import router as exports_router
from app.api.chat import router as chat_router
from app.api.portfolio import router as portfolio_router
from app.config.settings import settings
from app.db.database import engine, Base
from app.db import models
from app.middleware.metrics_middleware import MetricsMiddleware
from app.services.metrics_service import prometheus_exposition

Base.metadata.create_all(bind=engine)

from app.db.migrations import apply_schema_patches
apply_schema_patches()

_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
if not _origins or _origins == ["*"]:
    _origins = ["*"]

app = FastAPI(
    title="Quantara API",
    description="Live financial data API for Quantara platform",
    version="1.0.0",
)

app.add_middleware(MetricsMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
app.include_router(news_router, prefix="/api/v1")
app.include_router(filings_router, prefix="/api/v1")
app.include_router(research_router, prefix="/api/v1")
app.include_router(watchlists_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(exports_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(portfolio_router, prefix="/api/v1")


@app.get("/health")
@app.get("/healthz")
def health_check():
    return {"status": "ok"}


@app.get("/api/v1/metrics")
@app.get("/metrics")
def get_metrics():
    return Response(content=prometheus_exposition(), media_type="text/plain; version=0.0.4")
