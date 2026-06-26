import asyncio
import json
import logging
from datetime import datetime
from typing import Optional

from app.worker.celery_app import celery_app
from app.db.database import SessionLocal
from app.db import models

logger = logging.getLogger(__name__)


def _run_async(coro):
    return asyncio.run(coro)


@celery_app.task
def monitor_news():
    """Scan watchlist tickers for real news via shared context service."""
    logger.info("Executing News Monitor Job (live)")
    db = SessionLocal()
    try:
        tickers = list({item.ticker.upper() for item in db.query(models.WatchlistItem).all()})
        if not tickers:
            return "No tickers in watchlists"

        from app.services.context_service import fetch_company_context

        alerts_created = 0
        for ticker in tickers[:10]:
            try:
                bundle = _run_async(fetch_company_context(ticker))
                news = (bundle.get("data") or {}).get("latest_news") or []
                if not news:
                    continue
                headline = news[0]
                title = headline.get("title", "News event")
                existing = db.query(models.Alert).filter(
                    models.Alert.ticker == ticker,
                    models.Alert.title.contains(title[:60]),
                ).first()
                if existing:
                    continue

                sentiment = "Neutral"
                text = (title + " " + headline.get("summary", "")).lower()
                if any(w in text for w in ["beat", "surge", "upgrade", "record"]):
                    sentiment, severity = "Bullish", "success"
                elif any(w in text for w in ["miss", "downgrade", "lawsuit", "decline"]):
                    sentiment, severity = "Bearish", "warning"
                else:
                    severity = "info"

                alert = models.Alert(
                    ticker=ticker,
                    title=f"{ticker}: {title[:120]}",
                    summary=headline.get("summary", "")[:500],
                    why_it_matters=f"Live news detected via NewsAPI/FMP monitoring. Sentiment: {sentiment}.",
                    impact=f"{sentiment} news flow",
                    confidence=str(bundle.get("confidence", 50)),
                    source=headline.get("source", "News Monitor"),
                    severity=severity,
                )
                db.add(alert)
                alerts_created += 1
            except Exception as e:
                logger.warning(f"News monitor failed for {ticker}: {e}")

        db.add(models.AgentRun(
            agent_name="News Agent",
            status="Success",
            logs=f"Scanned {len(tickers)} tickers. Created {alerts_created} alerts from live news.",
        ))
        db.commit()
        return f"News monitor: {alerts_created} alerts from live data"
    except Exception as e:
        logger.error(f"monitor_news error: {e}")
        db.rollback()
        return str(e)
    finally:
        db.close()


@celery_app.task
def monitor_sec_filings():
    """Scan watchlist for new SEC filings via EDGAR."""
    logger.info("Executing SEC Filings Monitor (live)")
    db = SessionLocal()
    try:
        tickers = list({item.ticker.upper() for item in db.query(models.WatchlistItem).all()})
        if not tickers:
            return "No tickers"

        from app.services.sec_service import SecService
        from app.services.rag_service import ingest_ticker_from_edgar

        alerts_created = 0
        for ticker in tickers[:10]:
            try:
                filings_data = _run_async(SecService.get_filings(ticker))
                filings = filings_data.get("filings") or []
                if not filings:
                    continue
                latest = filings[0]
                title = f"New {latest.get('type', 'SEC')} Filed ({latest.get('date', '')})"
                existing = db.query(models.Alert).filter(
                    models.Alert.ticker == ticker,
                    models.Alert.title == f"{ticker}: {title}",
                ).first()
                if existing:
                    continue

                indexed = _run_async(ingest_ticker_from_edgar(ticker, latest.get("type", "10-K")))
                alert = models.Alert(
                    ticker=ticker,
                    title=f"{ticker}: {title}",
                    summary=f"SEC filing {latest.get('type')} dated {latest.get('date')} detected and indexed ({indexed} RAG chunks).",
                    why_it_matters="New regulatory disclosure may affect valuation and risk profile.",
                    impact="Material disclosure — review filing",
                    confidence="High",
                    source="SEC Monitor",
                    severity="info",
                )
                db.add(alert)
                alerts_created += 1
            except Exception as e:
                logger.warning(f"SEC monitor failed for {ticker}: {e}")

        db.add(models.AgentRun(
            agent_name="SEC Agent",
            status="Success",
            logs=f"Scanned {len(tickers)} tickers. {alerts_created} filing alerts.",
        ))
        db.commit()
        return f"SEC monitor: {alerts_created} alerts"
    except Exception as e:
        db.rollback()
        return str(e)
    finally:
        db.close()


@celery_app.task
def generate_daily_briefing():
    """AI-generated market briefing from last 24h alerts + watchlist context."""
    logger.info("Executing Daily Briefing Generator (Groq)")
    db = SessionLocal()
    try:
        from datetime import timedelta
        from app.ai.pipelines.intelligence_pipeline import run_intelligence_pipeline

        time_threshold = datetime.utcnow() - timedelta(hours=24)
        recent_alerts = db.query(models.Alert).filter(models.Alert.created_at >= time_threshold).all()
        tickers = list({a.ticker for a in recent_alerts}) or ["SPY"]

        alert_summary = "\n".join(
            f"- {a.ticker}: {a.title} ({a.impact})" for a in recent_alerts[:15]
        ) or "No critical alerts in the last 24 hours."

        result = _run_async(run_intelligence_pipeline(
            question=(
                f"Write an executive daily market briefing. Recent watchlist alerts:\n{alert_summary}\n"
                "Include macro outlook, top movers, risks, and actionable takeaways."
            ),
            ticker=tickers[0],
        ))

        briefing_content = f"# AI Daily Market Briefing\n\n{result.get('summary', '')}\n\n"
        briefing_content += f"**Confidence:** {result.get('confidence')}%\n\n"
        briefing_content += "## Key Points\n"
        for pt in result.get("bullish_points", [])[:5]:
            briefing_content += f"- {pt}\n"
        briefing_content += "\n## Risks\n"
        for pt in result.get("bearish_points", [])[:5]:
            briefing_content += f"- {pt}\n"

        db.add(models.DailyBriefing(content=briefing_content))
        db.add(models.AgentRun(
            agent_name="Daily Briefing Orchestrator",
            status="Success",
            logs="Groq-generated briefing from live alerts and context.",
        ))
        db.commit()
        return "Daily briefing generated via Groq"
    except Exception as e:
        logger.error(f"generate_daily_briefing: {e}")
        db.rollback()
        return str(e)
    finally:
        db.close()
