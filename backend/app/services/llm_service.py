"""Groq LLM provider — default for all AI features."""
import logging
from typing import AsyncGenerator

import httpx
from fastapi import HTTPException

from app.config.settings import settings

logger = logging.getLogger("llm")

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

QUANTARA_SYSTEM = (
    "You are Quantara AI.\n"
    "You are a professional equity research analyst.\n"
    "Use ONLY the supplied financial context.\n"
    "Never hallucinate.\n"
    "Never refuse because one API failed.\n"
    "Use every available source.\n"
    "If some sources are unavailable: mention them in missing_sources, lower confidence, and continue the analysis.\n"
    "Only state that no analysis is possible if absolutely zero data was retrieved."
)


def groq_ok() -> bool:
    return bool(settings.groq_api_key and settings.groq_api_key != "mock")


async def llm_complete(
    system: str,
    user: str,
    max_tokens: int = 1200,
    json_mode: bool = True,
) -> str:
    if not groq_ok():
        raise HTTPException(
            status_code=503,
            detail="AI features require GROQ_API_KEY in .env. Set LLM_PROVIDER=groq.",
        )

    payload: dict = {
        "model": settings.groq_model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.3,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(
            GROQ_API_URL,
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if resp.status_code != 200:
            logger.error(f"Groq error {resp.status_code}: {resp.text[:500]}")
            raise HTTPException(status_code=503, detail=f"Groq API error: {resp.status_code}")
        data = resp.json()
        return data["choices"][0]["message"]["content"] or "{}"


async def llm_stream(system: str, user: str, max_tokens: int = 800) -> AsyncGenerator[str, None]:
    if not groq_ok():
        raise RuntimeError("GROQ_API_KEY required. Set LLM_PROVIDER=groq in .env.")

    async with httpx.AsyncClient(timeout=90.0) as client:
        async with client.stream(
            "POST",
            GROQ_API_URL,
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.groq_model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "max_tokens": max_tokens,
                "temperature": 0.2,
                "stream": True,
            },
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.startswith("data: "):
                    continue
                chunk = line[6:]
                if chunk.strip() == "[DONE]":
                    break
                import json
                try:
                    parsed = json.loads(chunk)
                    delta = parsed["choices"][0]["delta"].get("content")
                    if delta:
                        yield delta
                except Exception:
                    continue
