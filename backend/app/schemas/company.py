from pydantic import BaseModel
from typing import List, Optional

class SearchResult(BaseModel):
    ticker: str
    name: str
    exchange: str
    logo: str
    sector: str
    industry: str

class CompanyProfile(BaseModel):
    name: str
    ticker: str
    exchange: str
    sector: str
    industry: str
    country: str
    ceo: str
    employees: str
    founded: str
    website: str
    market_cap: str
    description: str

class CompanyPrice(BaseModel):
    price: float
    change_1d: float
    status: str
    open: float
    high: float
    low: float
    prev_close: float
    high_52: float
    low_52: float
    volume: str

class MetricItem(BaseModel):
    label: str
    value: str
    status: str

class CompanyMetrics(BaseModel):
    metrics: List[MetricItem]
    snapshot: List[MetricItem]

class HistoricalPrice(BaseModel):
    date: str
    price: float
    volume: int

class CompanyHistory(BaseModel):
    data: List[HistoricalPrice]

class AISummary(BaseModel):
    overview: str
    strengths: List[str]
    risks: List[str]
    drivers: List[str]
