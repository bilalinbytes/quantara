"""
SEC RAG Pipeline — Qdrant semantic search + EDGAR fallback + Groq streaming.
"""
import json
import logging
from typing import AsyncGenerator, List, Dict, Optional

from app.services.llm_service import groq_ok, llm_stream, QUANTARA_SYSTEM
from app.services.rag_service import semantic_search, ingest_ticker_from_edgar
from app.services.context_service import fetch_company_context
from app.ai.guardrails import validate_user_query

logger = logging.getLogger("sec_pipeline")


async def _fallback_context(ticker: str, filing_type: Optional[str] = "10-K") -> List[Dict]:
    bundle = await fetch_company_context(ticker.upper())
    data = bundle.get("data") or {}
    chunks: List[Dict] = []

    if data.get("sec_sections"):
        for title, content in data["sec_sections"].items():
            chunks.append({
                "text": content[:2000],
                "section": title,
                "source": "SEC EDGAR",
                "score": 0.85,
            })

    if data.get("sec_filings"):
        for f in data["sec_filings"][:3]:
            if isinstance(f, dict):
                chunks.append({
                    "text": f"{f.get('type', 'Filing')}: {f.get('description', f.get('link', ''))}",
                    "section": "SEC Filing Summary",
                    "source": f"SEC {f.get('type', 'Filing')}",
                    "score": 0.5,
                })

    if chunks:
        return chunks[:8]

    from app.services.sec_service import SecService
    try:
        filings_data = await SecService.get_filings(ticker)
        filings = filings_data.get("filings", [])
        target_type = (filing_type or "10-K").upper()
        target = next(
            (f for f in filings if f["type"].upper().startswith(target_type)),
            filings[0] if filings else None,
        )
        if target:
            parsed = await SecService.get_parsed_filing(ticker, target["id"])
            for sec in parsed.get("sections", []):
                content = sec["content"]
                for i in range(0, min(len(content), 6000), 1000):
                    chunk = content[i:i + 1000].strip()
                    if len(chunk) > 100:
                        chunks.append({
                            "text": chunk,
                            "section": sec["title"],
                            "source": f"SEC {target['type']}",
                            "score": 0.0,
                        })
    except Exception as e:
        logger.warning(f"EDGAR fallback failed for {ticker}: {e}")

    return chunks[:8] or [{
        "text": "No SEC filing content retrieved.",
        "section": "N/A",
        "source": "SEC EDGAR",
        "score": 0.0,
    }]


class SecPipeline:

    async def chat_stream(
        self,
        query: str,
        ticker: str,
        history: list,
        filing_type: Optional[str] = "10-K",
    ) -> AsyncGenerator[str, None]:
        if not groq_ok():
            yield f"data: {json.dumps({'error': 'GROQ_API_KEY required.'})}\n\n"
            return

        validate_user_query(query)
        t = ticker.upper()

        yield f"data: {json.dumps({'status': 'Indexing SEC filings if needed…'})}\n\n"
        indexed = await ingest_ticker_from_edgar(t, filing_type or "10-K")
        if indexed:
            yield f"data: {json.dumps({'status': f'Indexed {indexed} SEC chunks in Qdrant'})}\n\n"

        yield f"data: {json.dumps({'status': 'Semantic RAG search…'})}\n\n"
        chunks = await semantic_search(query, t, top_k=6)

        if not chunks or chunks[0].get("score", 0) < 0.3:
            yield f"data: {json.dumps({'status': 'RAG low confidence — loading EDGAR sections…'})}\n\n"
            chunks = await _fallback_context(t, filing_type)

        context_parts = []
        citations = []
        for i, c in enumerate(chunks):
            context_parts.append(f"[{i + 1}] Section: {c['section']}\n{c['text']}")
            citations.append({
                "text": c["text"][:200],
                "section": c["section"],
                "source": c["source"],
                "confidence": round(c.get("score", 0.8), 3),
            })
        context_str = "\n\n---\n\n".join(context_parts)

        history_str = ""
        if history:
            recent = history[-6:]
            history_str = "\nPrevious conversation:\n" + "\n".join(
                f"{m['role'].upper()}: {m.get('content', '')[:200]}" for m in recent
            )

        system_prompt = (
            QUANTARA_SYSTEM + "\n\n"
            f"Analyze SEC filings for {t}. Cite sections by number. "
            "Prioritize Risk Factors, MD&A, Business Overview."
        )
        user_prompt = (
            f"SEC filing excerpts for {t}:\n\n{context_str}"
            f"{history_str}\n\nQuestion: {query}"
        )

        yield f"data: {json.dumps({'status': 'Generating answer with Groq…'})}\n\n"
        try:
            async for token in llm_stream(system_prompt, user_prompt, max_tokens=900):
                yield f"data: {json.dumps({'token': token})}\n\n"
        except RuntimeError as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        confidence = "High" if chunks and chunks[0].get("score", 0) > 0.5 else "Medium"
        yield f"data: {json.dumps({'done': True, 'citations': citations[:6], 'confidence': confidence, 'rag_chunks': len(chunks)})}\n\n"
