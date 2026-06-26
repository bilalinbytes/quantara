from pydantic import BaseModel
from typing import List, Dict, Any

class FinancialPeriod(BaseModel):
    date: str
    revenue: float
    gross_profit: float
    operating_income: float
    ebitda: float
    net_income: float
    eps: float
    assets: float
    liabilities: float
    equity: float
    operating_cf: float
    investing_cf: float
    financing_cf: float
    free_cash_flow: float
    roe: float
    roa: float
    gross_margin: float
    operating_margin: float
    debt_to_equity: float
    current_ratio: float

class CompanyFinancials(BaseModel):
    annual: List[FinancialPeriod]

class AIFinancialAnalysis(BaseModel):
    executive_summary: str
    revenue_analysis: str
    margin_analysis: str
    cash_flow_analysis: str
    financial_risks: str
    growth_opportunities: str
    overall_health: str
    confidence: str
    generated_at: str
