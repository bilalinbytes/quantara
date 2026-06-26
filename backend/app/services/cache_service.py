"""Redis cache — 10-minute TTL for shared company context."""
import json
import logging
from typing import Any, Optional

from app.config.settings import settings

logger = logging.getLogger("cache")

CACHE_TTL = 600  # 10 minutes
CONTEXT_CACHE_PREFIX = "quantara:ctx:v2"
_redis = None


async def _get_redis():
    global _redis
    if _redis is None:
        import redis.asyncio as aioredis
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


def context_cache_key(ticker: str) -> str:
    return f"{CONTEXT_CACHE_PREFIX}:{ticker.upper()}"


async def cache_get(key: str) -> Optional[Any]:
    try:
        r = await _get_redis()
        val = await r.get(key)
        from app.services.metrics_service import inc
        if val:
            inc("cache_hits_total")
            return json.loads(val)
        inc("cache_misses_total")
        return None
    except Exception as e:
        logger.warning(f"Redis get failed for {key}: {e}")
        return None


async def cache_set(key: str, value: Any, ttl: int = CACHE_TTL) -> None:
    try:
        r = await _get_redis()
        await r.setex(key, ttl, json.dumps(value, default=str))
    except Exception as e:
        logger.warning(f"Redis set failed for {key}: {e}")
