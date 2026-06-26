import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "quantara_worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.worker.tasks"]
)

celery_app.conf.beat_schedule = {
    "monitor_news_every_15_mins": {
        "task": "app.worker.tasks.monitor_news",
        "schedule": 900.0, # 15 minutes
    },
    "monitor_sec_every_15_mins": {
        "task": "app.worker.tasks.monitor_sec_filings",
        "schedule": 900.0,
    },
    "generate_daily_briefing": {
        "task": "app.worker.tasks.generate_daily_briefing",
        "schedule": 86400.0, # 24 hours
    }
}
celery_app.conf.timezone = 'UTC'
