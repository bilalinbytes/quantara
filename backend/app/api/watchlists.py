from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.db.database import get_db
from app.db import models
from app.schemas import watchlist as schemas
from datetime import datetime

router = APIRouter()

# Helper to get or create a default user (id=1) since we don't have authentication yet.
def get_default_user_id(db: Session) -> int:
    user = db.query(models.User).filter(models.User.id == 1).first()
    if not user:
        user = models.User(id=1, email="user@quantara.ai")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user.id

@router.get("/watchlists", response_model=List[schemas.WatchlistSchema])
def get_watchlists(db: Session = Depends(get_db)):
    user_id = get_default_user_id(db)
    watchlists = db.query(models.Watchlist).filter(models.Watchlist.user_id == user_id).all()
    
    # If no watchlists exist, create a default one to make the app feel alive instantly
    if not watchlists:
        default_wl = models.Watchlist(name="Tech Giants", user_id=user_id)
        db.add(default_wl)
        db.commit()
        db.refresh(default_wl)
        
        # Add default tickers
        for ticker in ["AAPL", "MSFT", "NVDA"]:
            item = models.WatchlistItem(ticker=ticker, watchlist_id=default_wl.id)
            db.add(item)
        db.commit()
        db.refresh(default_wl)
        watchlists = [default_wl]
        
    return watchlists

@router.post("/watchlists", response_model=schemas.WatchlistSchema)
def create_watchlist(wl: schemas.WatchlistCreate, db: Session = Depends(get_db)):
    user_id = get_default_user_id(db)
    db_wl = models.Watchlist(name=wl.name, user_id=user_id)
    db.add(db_wl)
    db.commit()
    db.refresh(db_wl)
    return db_wl

@router.delete("/watchlists/{watchlist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_watchlist(watchlist_id: int, db: Session = Depends(get_db)):
    user_id = get_default_user_id(db)
    db_wl = db.query(models.Watchlist).filter(
        models.Watchlist.id == watchlist_id,
        models.Watchlist.user_id == user_id
    ).first()
    if not db_wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    
    # Delete associated items first (or depend on cascade, let's delete manually to be safe)
    db.query(models.WatchlistItem).filter(models.WatchlistItem.watchlist_id == watchlist_id).delete()
    db.delete(db_wl)
    db.commit()
    return None

@router.post("/watchlists/{watchlist_id}/tickers", response_model=schemas.WatchlistItemSchema)
def add_ticker_to_watchlist(watchlist_id: int, item: schemas.WatchlistItemCreate, db: Session = Depends(get_db)):
    user_id = get_default_user_id(db)
    # Check if watchlist exists and belongs to user
    db_wl = db.query(models.Watchlist).filter(
        models.Watchlist.id == watchlist_id,
        models.Watchlist.user_id == user_id
    ).first()
    if not db_wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    
    # Check if ticker already in watchlist
    ticker_upper = item.ticker.upper()
    existing_item = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.watchlist_id == watchlist_id,
        models.WatchlistItem.ticker == ticker_upper
    ).first()
    if existing_item:
        return existing_item
        
    db_item = models.WatchlistItem(ticker=ticker_upper, watchlist_id=watchlist_id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    # Generate an alert about adding a ticker as an immediate autonomous trigger (simulating the pipeline)
    alert = models.Alert(
        ticker=ticker_upper,
        title=f"Initialized AI Monitoring for {ticker_upper}",
        summary=f"Quantara background agents successfully attached to {ticker_upper} monitoring pipelines.",
        why_it_matters=f"Real-time news, SEC filings, and volume thresholds are now actively analyzed for anomalous activities.",
        impact=f"Pipeline initialized. Sentiment tracker started.",
        confidence="High",
        source="System Monitor",
        severity="info"
    )
    db.add(alert)
    db.commit()
    
    return db_item

@router.delete("/watchlists/{watchlist_id}/tickers/{ticker}", status_code=status.HTTP_204_NO_CONTENT)
def remove_ticker_from_watchlist(watchlist_id: int, ticker: str, db: Session = Depends(get_db)):
    user_id = get_default_user_id(db)
    db_wl = db.query(models.Watchlist).filter(
        models.Watchlist.id == watchlist_id,
        models.Watchlist.user_id == user_id
    ).first()
    if not db_wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
        
    db_item = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.watchlist_id == watchlist_id,
        models.WatchlistItem.ticker == ticker.upper()
    ).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Ticker not found in watchlist")
        
    db.delete(db_item)
    db.commit()
    return None

@router.get("/alerts", response_model=List[schemas.AlertSchema])
def get_alerts(db: Session = Depends(get_db)):
    alerts = db.query(models.Alert).order_by(models.Alert.created_at.desc()).all()
    
    # If no alerts exist, let's create a few realistic alerts to populate the dashboard nicely
    if not alerts:
        default_alerts = [
            models.Alert(
                ticker="AAPL",
                title="Apple Inc. Announces Generative AI App Store",
                summary="Apple plans to launch an App Store dedicated exclusively to third-party generative AI services, integrated directly into the next iOS version. Analysts project this could drive high-margin services revenue up by 15%.",
                why_it_matters="Monetization of generative AI has been a primary concern for investors. An ecosystem play via the App Store allows Apple to extract 30% cuts on AI subscriptions without taking direct compute costs.",
                impact="Highly Positive (+12% Services revenue projection adjustment)",
                confidence="High",
                source="News Monitor",
                severity="success"
            ),
            models.Alert(
                ticker="MSFT",
                title="Microsoft 10-K Risk Section Update: Cyber-Resiliency",
                summary="Microsoft's newly filed 10-K highlights enhanced risk disclosures regarding cybersecurity liability and insurance caps following recent global infrastructure outages.",
                why_it_matters="Increasing legal exposures may lead to higher insurance premiums and larger cash reserves, though it does not impact near-term cloud growth.",
                impact="Neutral to slightly negative (increase in operational risk metric)",
                confidence="Medium",
                source="SEC Monitor",
                severity="warning"
            ),
            models.Alert(
                ticker="NVDA",
                title="NVIDIA Insider Trading: Director Sells $45M in Shares",
                summary="NVIDIA board member sold 350,000 shares under a pre-arranged 10b5-1 trading plan. The sale represents less than 2% of the director's total holdings.",
                why_it_matters="Insider sales under 10b5-1 plans are generally non-events, but public perception often flags large liquidations as profit-taking. No structural changes to GPU demand.",
                impact="Neutral (Noise filtered out by AI Engine)",
                confidence="High",
                source="Insider Monitor",
                severity="info"
            )
        ]
        db.add_all(default_alerts)
        db.commit()
        alerts = db.query(models.Alert).order_by(models.Alert.created_at.desc()).all()
        
    return alerts

@router.patch("/alerts/{alert_id}", response_model=schemas.AlertSchema)
def update_alert(alert_id: int, alert_update: schemas.AlertUpdate, db: Session = Depends(get_db)):
    db_alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not db_alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    if alert_update.is_read is not None:
        db_alert.is_read = alert_update.is_read
    if alert_update.is_pinned is not None:
        db_alert.is_pinned = alert_update.is_pinned
        
    db.commit()
    db.refresh(db_alert)
    return db_alert

@router.get("/briefing")
def get_daily_briefing(db: Session = Depends(get_db)):
    briefing = db.query(models.DailyBriefing).order_by(models.DailyBriefing.created_at.desc()).first()
    
    # If no briefing exists, create a default one
    if not briefing:
        content = """# AI Daily Market Briefing

*Generated on Friday, June 26, 2026 at 09:30 AM EST by Quantara Agent Network*

---

## 📈 Watchlist Impact Analysis
Your monitored equities are reacting to major catalysts this morning:
* **AAPL (+1.8%)**: Added to AI Monitor. Buzz around their upcoming App Store expansion is driving bullish sentiment.
* **MSFT (Flat)**: Quiet ahead of the upcoming weekend. The 10-K filing indicates high cybersecurity resiliency focus, which is viewed positively by institutional risk managers.
* **NVDA (-0.4%)**: Minimal pullback after yesterday's routine director share sale under a 10b5-1 plan. Demand for H200 and Blackwell chips remains robust.

## 📰 Top Macro Events
1. **Federal Reserve Interest Rate Outlook**: Fed Chairman hinted at potential cuts if inflation sustains near the 2% target, boosting tech sectors.
2. **Global Trade Flows**: Shipping bottlenecks in Southeast Asia could pose supply chain challenges for hardware manufacturers heading into Q3.

## ⚠️ Critical Watchlist Risks
* **Regulatory Compliance**: EU regulatory committees are drafting stiffer penalties for tech companies failing to implement transparent AI sourcing, affecting all AI platform providers.
"""
        briefing = models.DailyBriefing(content=content)
        db.add(briefing)
        db.commit()
        db.refresh(briefing)
        
    return {"id": briefing.id, "content": briefing.content, "created_at": briefing.created_at}

# Helper route to manually trigger background monitoring (so user can test)
@router.post("/monitor/trigger")
def trigger_monitoring(db: Session = Depends(get_db)):
    # Simulates news/SEC/market checks for AAPL, MSFT, NVDA and generates a new alert
    import random
    tickers = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN"]
    selected_ticker = random.choice(tickers)
    
    events = [
        {
            "title": "Unusual Options Activity detected",
            "summary": "Large sweep of near-the-money call options expiring in 14 days, valued at over $12.4M, detected in early trading.",
            "why_it_matters": "Sweeps of this size typically indicate institutional repositioning ahead of a major product launch or regulatory announcement.",
            "impact": "Bullish short-term momentum",
            "severity": "info",
            "source": "Market Monitor"
        },
        {
            "title": "Supply Chain Channel Checks: Production Ramp-up",
            "summary": "Reports from Taiwan assembly plants indicate component orders for the next hardware generation have been increased by 15% quarter-over-quarter.",
            "why_it_matters": "Strong order book suggests solid carrier and consumer demand, lowering inventory write-down risks.",
            "impact": "Favorable growth catalyst",
            "severity": "success",
            "source": "News Monitor"
        },
        {
            "title": "Patent Dispute Verdict Announced",
            "summary": "A federal circuit court has ruled in favor of a patent troll concerning a legacy wireless network module. The company faces a $75M fine.",
            "why_it_matters": "The settlement size is immaterial relative to the cash position, but could create legal precedent for other hardware divisions.",
            "impact": "Slight negative (noise level)",
            "severity": "warning",
            "source": "News Monitor"
        }
    ]
    
    event = random.choice(events)
    alert = models.Alert(
        ticker=selected_ticker,
        title=f"{selected_ticker}: {event['title']}",
        summary=event['summary'],
        why_it_matters=event['why_it_matters'],
        impact=event['impact'],
        confidence=random.choice(["High", "Medium"]),
        source=event['source'],
        severity=event['severity']
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return {"status": "triggered", "alert_generated": alert}
