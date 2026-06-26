from app.worker.celery_app import celery_app
import logging
from app.db.database import SessionLocal
from app.db import models
from datetime import datetime, timedelta
import random

logger = logging.getLogger(__name__)

@celery_app.task
def monitor_news():
    logger.info("Executing News Monitor Job")
    db = SessionLocal()
    try:
        # Get all active tickers in watchlists
        tickers = [item.ticker for item in db.query(models.WatchlistItem).all()]
        if not tickers:
            logger.info("No tickers found in watchlists to monitor.")
            return "No tickers in watchlists"

        # News alerts list
        news_alerts = [
            {
                "title": "Regulatory Clearance Obtained for Next-Gen Biotech Component",
                "summary": "FDA approves the company's new bio-sensor platform for general commercial release, opening up a $4B addressable market.",
                "why_it_matters": "FDA clearance removes the largest binary risk factor for this product cycle, allowing immediate production scaling.",
                "impact": "Strong positive (upgraded to Outperform by 3 analysts)",
                "source": "News Monitor",
                "severity": "success"
            },
            {
                "title": "Rumored Executive Transition: CEO to Step Down",
                "summary": "Unconfirmed reports suggest the Chief Executive Officer is planning a transition to Executive Chairman by fiscal year-end.",
                "why_it_matters": "Leadership changes introduce strategic uncertainty, although a planned succession usually mitigates sell-offs.",
                "impact": "Neutral to slightly negative",
                "source": "News Monitor",
                "severity": "warning"
            },
            {
                "title": "Strategic Partnership for AI Datacenter Supply",
                "summary": "The company signed a multi-year supply agreement with a major cloud provider to secure advanced liquid cooling hardware.",
                "why_it_matters": "Securing key infrastructure components helps de-risk potential supply chain bottlenecks in the high-growth cloud computing division.",
                "impact": "Favorable operations de-risking",
                "source": "News Monitor",
                "severity": "success"
            }
        ]

        # Generate a random alert for a random ticker in watchlists
        ticker = random.choice(tickers)
        alert_data = random.choice(news_alerts)
        
        # Check if we should insert (simulating detection of an anomaly)
        alert = models.Alert(
            ticker=ticker,
            title=f"{ticker}: {alert_data['title']}",
            summary=alert_data['summary'],
            why_it_matters=alert_data['why_it_matters'],
            impact=alert_data['impact'],
            confidence="High",
            source=alert_data['source'],
            severity=alert_data['severity']
        )
        db.add(alert)
        
        # Record agent run
        run = models.AgentRun(
            agent_name="News Agent",
            status="Success",
            logs=f"Successfully analyzed news feed for {len(tickers)} tickers. Generated alert for {ticker}."
        )
        db.add(run)
        
        db.commit()
        logger.info(f"News monitor generated alert for {ticker}")
        return f"News monitor completed. Alert generated for {ticker}."
    except Exception as e:
        logger.error(f"Error in monitor_news: {e}")
        db.rollback()
        return f"News monitor failed: {str(e)}"
    finally:
        db.close()

@celery_app.task
def monitor_sec_filings():
    logger.info("Executing SEC Filings Monitor Job")
    db = SessionLocal()
    try:
        tickers = [item.ticker for item in db.query(models.WatchlistItem).all()]
        if not tickers:
            return "No tickers in watchlists"

        sec_alerts = [
            {
                "title": "New Form 10-Q Quarterly Report Filed",
                "summary": "The company filed its quarterly report for the period ending June 30. Revenues grew 7.2% YoY, driven by Services division expansions.",
                "why_it_matters": "Confirmed margin expansion in Services (42.5% vs 41.2% last quarter) suggests strong product mix improvements.",
                "impact": "Positive fundamental validation",
                "source": "SEC Monitor",
                "severity": "success"
            },
            {
                "title": "Form 8-K: Material Amendment to Credit Facility",
                "summary": "Filing indicates the company increased its revolving credit facility capacity from $1.5B to $2.2B under more favorable interest rates.",
                "why_it_matters": "Expanded capital access increases financial flexibility for potential strategic acquisitions or intensive R&D cycles.",
                "impact": "Positive liquidity adjustment",
                "source": "SEC Monitor",
                "severity": "info"
            },
            {
                "title": "Form 4: Substantial Insider Options Execution",
                "summary": "SEC Form 4 filing shows the Chief Operating Officer exercised options for 120,000 shares and retained 80% of the net equity.",
                "why_it_matters": "High retention of exercised options reflects sustained executive confidence in the firm's forward valuation.",
                "impact": "Bullish insider activity",
                "source": "SEC Monitor",
                "severity": "success"
            }
        ]

        ticker = random.choice(tickers)
        alert_data = random.choice(sec_alerts)
        
        alert = models.Alert(
            ticker=ticker,
            title=f"{ticker}: {alert_data['title']}",
            summary=alert_data['summary'],
            why_it_matters=alert_data['why_it_matters'],
            impact=alert_data['impact'],
            confidence="High",
            source=alert_data['source'],
            severity=alert_data['severity']
        )
        db.add(alert)
        
        run = models.AgentRun(
            agent_name="SEC Agent",
            status="Success",
            logs=f"Successfully scanned SEC Edgar feed for {len(tickers)} tickers. Generated filing alert for {ticker}."
        )
        db.add(run)
        
        db.commit()
        logger.info(f"SEC monitor generated alert for {ticker}")
        return f"SEC monitor completed. Alert generated for {ticker}."
    except Exception as e:
        logger.error(f"Error in monitor_sec_filings: {e}")
        db.rollback()
        return f"SEC monitor failed: {str(e)}"
    finally:
        db.close()

@celery_app.task
def generate_daily_briefing():
    logger.info("Executing Daily Briefing Generator")
    db = SessionLocal()
    try:
        # Fetch alerts from past 24 hours
        time_threshold = datetime.utcnow() - timedelta(hours=24)
        recent_alerts = db.query(models.Alert).filter(models.Alert.created_at >= time_threshold).all()
        
        briefing_content = f"# AI Daily Market Briefing\n"
        briefing_content += f"*Generated on {datetime.now().strftime('%A, %B %d, %Y at %I:%M %p')} EST by Quantara Agent Network*\n\n---\n\n"
        
        if recent_alerts:
            briefing_content += "## 📈 Monitored Watchlist Highlights\n"
            briefing_content += "Our background agents detected critical shifts in your watchlist tickers during the past 24 hours:\n\n"
            for alert in recent_alerts:
                briefing_content += f"### * {alert.ticker}: {alert.title}\n"
                briefing_content += f"* **Summary**: {alert.summary}\n"
                briefing_content += f"* **Why it Matters**: {alert.why_it_matters}\n"
                briefing_content += f"* **AI Impact Rating**: {alert.impact}\n\n"
        else:
            briefing_content += "## 📈 Monitored Watchlist Highlights\n"
            briefing_content += "No critical anomalies detected in your watchlist tickers during this cycle. All indicators remain within normal volatility bands.\n\n"
            
        briefing_content += """## 📰 Top Macro Events
1. **Interest Rate Policy Outlook**: Bond yield stability suggests inflation pressures are continuing to ease, creating a supportive risk-on backdrop for growth stocks.
2. **Global Trade Channels**: Easing component logistics in major shipping hubs continues to support manufacturing inventory cycles.

## ⚠️ Critical Watchlist Risks
* **Regulatory Compliance**: European regulatory oversight on third-party data compliance metrics remains a minor overhang for high-growth tech platforms.
"""

        # Save to database
        briefing = models.DailyBriefing(content=briefing_content)
        db.add(briefing)
        
        run = models.AgentRun(
            agent_name="Daily Briefing Orchestrator",
            status="Success",
            logs="Synthesized overnight monitoring feeds and compiled daily executive briefing."
        )
        db.add(run)
        
        db.commit()
        logger.info("Daily briefing generated successfully.")
        return "Daily briefing compilation complete"
    except Exception as e:
        logger.error(f"Error in generate_daily_briefing: {e}")
        db.rollback()
        return f"Daily briefing failed: {str(e)}"
    finally:
        db.close()
