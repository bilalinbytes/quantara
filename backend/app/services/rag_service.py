"""Production SEC RAG — ingest, embed, index in Qdrant, semantic search."""
import hashlib
import logging
import uuid
from typing import Any, Dict, List, Optional

from app.config.settings import settings
from app.services.metrics_service import inc

logger = logging.getLogger("rag_service")

COLLECTION = "sec_filings"
VECTOR_SIZE = 384


def _embed_text(text: str) -> List[float]:
    """Local embedding via fastembed (no external API key)."""
    try:
        from fastembed import TextEmbedding
        model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
        vectors = list(model.embed([text[:8000]]))
        return vectors[0].tolist()
    except Exception as e:
        logger.warning(f"fastembed failed, using hash fallback: {e}")
        h = hashlib.sha384(text.encode()).digest()
        return [((h[i % len(h)] / 255.0) * 2 - 1) for i in range(VECTOR_SIZE)]


async def _qdrant_client():
    from qdrant_client import AsyncQdrantClient
    return AsyncQdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key)


async def ensure_collection() -> bool:
    try:
        from qdrant_client.models import Distance, VectorParams
        client = await _qdrant_client()
        collections = await client.get_collections()
        names = [c.name for c in collections.collections]
        if COLLECTION not in names:
            await client.create_collection(
                collection_name=COLLECTION,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
            )
        return True
    except Exception as e:
        logger.warning(f"Qdrant ensure_collection failed: {e}")
        return False


def _chunk_text(text: str, chunk_size: int = 900, overlap: int = 120) -> List[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        piece = text[start:end].strip()
        if len(piece) > 80:
            chunks.append(piece)
        start += chunk_size - overlap
    return chunks[:40]


async def ingest_filing_sections(
    ticker: str,
    filing_type: str,
    filing_date: str,
    sections: Dict[str, str],
) -> int:
    """Embed and upsert SEC sections into Qdrant. Returns chunk count."""
    if not await ensure_collection():
        return 0

    from qdrant_client.models import PointStruct
    client = await _qdrant_client()
    points: List[PointStruct] = []
    t = ticker.upper()

    for section_title, content in sections.items():
        for i, chunk in enumerate(_chunk_text(content)):
            vector = _embed_text(chunk)
            points.append(PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={
                    "ticker": t,
                    "section": section_title,
                    "text": chunk,
                    "filing_type": filing_type,
                    "filing_date": filing_date,
                    "source": f"SEC {filing_type}",
                },
            ))

    if not points:
        return 0

    await client.upsert(collection_name=COLLECTION, points=points)
    logger.info(f"Indexed {len(points)} chunks for {t} {filing_type}")
    return len(points)


async def ingest_ticker_from_edgar(ticker: str, filing_type: str = "10-K") -> int:
    """Fetch latest filing from EDGAR, parse sections, index in Qdrant."""
    from app.services.sec_service import SecService
    filings_data = await SecService.get_filings(ticker)
    filings = filings_data.get("filings") or []
    target = next(
        (f for f in filings if f["type"].upper().startswith(filing_type.upper())),
        filings[0] if filings else None,
    )
    if not target:
        return 0
    parsed = await SecService.get_parsed_filing(ticker, target["id"])
    sections = {
        sec["title"]: sec["content"]
        for sec in parsed.get("sections", [])
        if sec.get("content")
    }
    return await ingest_filing_sections(
        ticker, target.get("type", filing_type), target.get("date", ""), sections
    )


async def semantic_search(
    query: str,
    ticker: str,
    top_k: int = 6,
) -> List[Dict[str, Any]]:
    """Vector search with citation payloads."""
    inc("rag_queries_total")
    if not await ensure_collection():
        return []

    from qdrant_client.models import Filter, FieldCondition, MatchValue
    client = await _qdrant_client()
    vector = _embed_text(query)

    try:
        results = await client.search(
            collection_name=COLLECTION,
            query_vector=vector,
            query_filter=Filter(
                must=[FieldCondition(key="ticker", match=MatchValue(value=ticker.upper()))]
            ),
            limit=top_k,
            with_payload=True,
        )
        return [
            {
                "text": r.payload.get("text", ""),
                "section": r.payload.get("section", "Unknown"),
                "source": r.payload.get("source", "SEC Filing"),
                "score": float(r.score),
                "filing_date": r.payload.get("filing_date", ""),
            }
            for r in results
        ]
    except Exception as e:
        logger.warning(f"Qdrant search failed: {e}")
        return []
