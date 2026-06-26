"""
Multi-agent orchestrator — each agent runs an independent Groq analysis,
then a synthesizer agent merges outputs into a final report.
"""
import asyncio
import json
import logging
from typing import Any, AsyncGenerator, Dict, List, Optional

from app.services.context_service import fetch_company_context, build_context_prompt
from app.services.llm_service import llm_complete, QUANTARA_SYSTEM
from app.services.metrics_service import inc

logger = logging.getLogger("agent_orchestrator")

AGENT_DEFINITIONS = [
    {
        "name": "Financial Agent",
        "focus": "Revenue growth, margins, debt, cash flow, ROE, ROIC, balance sheet strength.",
        "data_keys": ["income_statement", "balance_sheet", "cash_flow", "financial_ratios", "key_metrics"],
    },
    {
        "name": "News Agent",
        "focus": "Latest headlines, sentiment, catalysts, market narrative, press releases.",
        "data_keys": ["latest_news", "press_releases", "general_market_news"],
    },
    {
        "name": "SEC Agent",
        "focus": "Risk factors, MD&A, business overview, regulatory disclosures.",
        "data_keys": ["sec_sections", "sec_filings"],
    },
    {
        "name": "Valuation Agent",
        "focus": "P/E, PEG, price targets, analyst estimates, fair value assessment.",
        "data_keys": ["financial_ratios", "key_metrics", "price_targets", "analyst_estimates", "analyst_ratings"],
    },
    {
        "name": "Technical Agent",
        "focus": "Price trend, SMA, momentum, support/resistance, volume.",
        "data_keys": ["live_quote", "historical_prices", "technical_indicators"],
    },
    {
        "name": "Macro Agent",
        "focus": "Sector context, general market news, macro headwinds/tailwinds.",
        "data_keys": ["company_profile", "general_market_news"],
    },
    {
        "name": "Risk Agent",
        "focus": "Downside risks, bear case, regulatory, competitive threats.",
        "data_keys": ["sec_sections", "latest_news", "financial_ratios"],
    },
    {
        "name": "Portfolio Agent",
        "focus": "Portfolio fit, diversification, correlation, position sizing guidance.",
        "data_keys": ["live_quote", "company_profile", "key_metrics"],
    },
]


def _agent_context(bundle: Dict[str, Any], data_keys: List[str]) -> Dict[str, Any]:
    data = bundle.get("data") or {}
    return {k: data.get(k) for k in data_keys if data.get(k)}


async def run_single_agent(
    agent: Dict[str, Any],
    ticker: str,
    bundle: Dict[str, Any],
) -> Dict[str, Any]:
    ctx = _agent_context(bundle, agent["data_keys"])
    if not any(ctx.values()):
        return {
            "agent": agent["name"],
            "status": "skipped",
            "findings": [f"No data available for {agent['name']} domain."],
            "confidence": 20,
        }

    system = (
        QUANTARA_SYSTEM + "\n\n"
        f"You are the {agent['name']} in an institutional research team.\n"
        f"Focus: {agent['focus']}\n"
        "Return ONLY valid JSON: "
        '{"findings":["string"],"risks":["string"],"confidence":0-100,"summary":"string"}'
    )
    user = (
        f"Ticker: {ticker.upper()}\n"
        f"Your domain data:\n{json.dumps(ctx, default=str)[:6000]}"
    )
    try:
        raw = await llm_complete(system, user, max_tokens=800)
        result = json.loads(raw)
        result["agent"] = agent["name"]
        result["status"] = "complete"
        return result
    except Exception as e:
        logger.warning(f"{agent['name']} failed: {e}")
        return {"agent": agent["name"], "status": "error", "findings": [str(e)], "confidence": 0}


async def synthesize_agents(
    ticker: str,
    bundle: Dict[str, Any],
    agent_outputs: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Synthesizer agent merges all agent JSON into report sections."""
    context_prompt = build_context_prompt(
        bundle,
        f"Synthesize institutional research report for {ticker.upper()}",
    )
    system = (
        QUANTARA_SYSTEM + "\n\n"
        "You are the Lead Research Synthesizer. Merge agent outputs into a final report.\n"
        "Return ONLY valid JSON as a list: "
        '[{"title":"string","content":"string","citations":[{"text":"string","source":"string"}]}]\n'
        "Required sections: Executive Summary, Financial Analysis, Market Position, "
        "Risk Assessment, Valuation & Price Target, Investment Thesis."
    )
    user = (
        f"Agent outputs:\n{json.dumps(agent_outputs, default=str)[:8000]}\n\n"
        f"Full market context:\n{context_prompt[:6000]}"
    )
    raw = await llm_complete(system, user, max_tokens=2500)
    report = json.loads(raw)
    if isinstance(report, dict):
        report = report.get("report") or report.get("sections") or [report]
    return report


class AgentOrchestrator:
    async def run_research_stream(self, ticker: str) -> AsyncGenerator[str, None]:
        t = ticker.upper()
        inc("agent_runs_total")

        yield f"data: {json.dumps({'status': 'agent_running', 'agent': 'Context Service'})}\n\n"
        bundle = await fetch_company_context(t)
        yield f"data: {json.dumps({'status': 'agent_complete', 'agent': 'Context Service', 'sources': bundle.get('source_count')})}\n\n"

        agent_outputs: List[Dict[str, Any]] = []

        async def _run_and_emit(agent_def: Dict) -> Dict:
            yield_evt = f"data: {json.dumps({'status': 'agent_running', 'agent': agent_def['name']})}\n\n"
            return agent_def, yield_evt

        for agent_def in AGENT_DEFINITIONS:
            yield f"data: {json.dumps({'status': 'agent_running', 'agent': agent_def['name']})}\n\n"
            output = await run_single_agent(agent_def, t, bundle)
            agent_outputs.append(output)
            yield f"data: {json.dumps({'status': 'agent_complete', 'agent': agent_def['name'], 'confidence': output.get('confidence', 0)})}\n\n"

        yield f"data: {json.dumps({'status': 'synthesizing', 'agent': 'Lead Synthesizer'})}\n\n"
        try:
            report = await synthesize_agents(t, bundle, agent_outputs)
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"
            return

        payload = {
            "status": "complete",
            "report": report,
            "confidence": bundle.get("confidence"),
            "metadata": {
                "agents_executed": len(agent_outputs),
                "agent_outputs": agent_outputs,
                "sources_used": bundle.get("sources_used"),
                "missing_sources": bundle.get("missing_sources"),
                "orchestration": "multi-agent-groq",
            },
        }
        yield f"data: {json.dumps(payload)}\n\n"

    async def generate_research_report(self, ticker: str) -> AsyncGenerator[str, None]:
        async for event in self.run_research_stream(ticker):
            yield event
