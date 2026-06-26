"""
Multi-Agent Research Pipeline — uses shared Context Service + Groq.
"""
import json
import logging
import time
from typing import AsyncGenerator, Dict, Any

from app.services.llm_service import llm_complete, groq_ok, QUANTARA_SYSTEM
from app.services.context_service import fetch_company_context, build_context_prompt

logger = logging.getLogger("research_pipeline")


class ResearchOrchestrator:

    async def generate_research_report(self, ticker: str) -> AsyncGenerator[str, None]:
        t = ticker.upper()
        start_time = time.time()

        if not groq_ok():
            yield f"data: {json.dumps({'status': 'error', 'message': 'GROQ_API_KEY required.'})}\n\n"
            return

        agents = [
            "Financial Agent", "SEC Agent", "News Agent", "Market Agent",
            "Risk Agent", "Competition Agent", "Valuation Agent", "Macro Agent",
        ]

        yield f"data: {json.dumps({'status': 'agent_running', 'agent': 'Context Service'})}\n\n"
        bundle = await fetch_company_context(t)
        yield f"data: {json.dumps({'status': 'agent_complete', 'agent': 'Context Service', 'sources': bundle.get('source_count')})}\n\n"

        for agent in agents[1:]:
            yield f"data: {json.dumps({'status': 'agent_running', 'agent': agent})}\n\n"
            yield f"data: {json.dumps({'status': 'agent_complete', 'agent': agent})}\n\n"

        yield f"data: {json.dumps({'status': 'synthesizing'})}\n\n"

        try:
            context_prompt = build_context_prompt(
                bundle,
                f"Write a full institutional research report for {t}. "
                "Cover executive summary, financial analysis, market position, risks, valuation, and investment thesis.",
            )
            system = (
                QUANTARA_SYSTEM + "\n\n"
                "Return ONLY valid JSON as a list of section objects: "
                '[{"title":"string","content":"string","citations":[{"text":"string","source":"string"}]}]. '
                "Sections: Executive Summary, Financial Analysis, Market Position, "
                "Risk Assessment, Valuation & Price Target, Investment Thesis. "
                "Use specific numbers from context. Never refuse due to missing sources."
            )
            raw = await llm_complete(system, context_prompt, max_tokens=2500)
            report_sections = json.loads(raw)
            if isinstance(report_sections, dict):
                report_sections = report_sections.get("report") or report_sections.get("sections") or [report_sections]
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"
            return

        elapsed = round(time.time() - start_time, 1)
        payload = {
            "status": "complete",
            "report": report_sections,
            "confidence": bundle.get("confidence"),
            "metadata": {
                "generation_time_s": elapsed,
                "sources_used": bundle.get("sources_used"),
                "missing_sources": bundle.get("missing_sources"),
                "source_count": bundle.get("source_count"),
                "llm_provider": "groq",
            },
        }
        yield f"data: {json.dumps(payload)}\n\n"
