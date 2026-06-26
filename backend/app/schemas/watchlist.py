from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class WatchlistItemBase(BaseModel):
    ticker: str

class WatchlistItemCreate(WatchlistItemBase):
    pass

class WatchlistItemSchema(WatchlistItemBase):
    id: int
    watchlist_id: int

    class Config:
        from_attributes = True

class WatchlistBase(BaseModel):
    name: str

class WatchlistCreate(WatchlistBase):
    pass

class WatchlistSchema(WatchlistBase):
    id: int
    user_id: int
    items: List[WatchlistItemSchema] = []

    class Config:
        from_attributes = True

class AlertSchema(BaseModel):
    id: int
    ticker: str
    title: str
    summary: str
    why_it_matters: str
    impact: str
    confidence: str
    source: str
    severity: str
    is_read: bool
    is_pinned: bool
    created_at: datetime

    class Config:
        from_attributes = True

class AlertUpdate(BaseModel):
    is_read: Optional[bool] = None
    is_pinned: Optional[bool] = None

class DailyBriefingSchema(BaseModel):
    id: int
    content: str
    created_at: datetime

    class Config:
        from_attributes = True
