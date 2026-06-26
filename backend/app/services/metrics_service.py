"""Live Prometheus metrics — request counts, latency, cache, Groq calls."""
import time
from typing import Dict

_metrics: Dict[str, float] = {
    "api_calls_total": 0,
    "groq_calls_total": 0,
    "cache_hits_total": 0,
    "cache_misses_total": 0,
    "api_latency_sum": 0.0,
    "api_latency_count": 0,
    "rag_queries_total": 0,
    "agent_runs_total": 0,
}


def inc(name: str, amount: float = 1) -> None:
    _metrics[name] = _metrics.get(name, 0) + amount


def observe_latency(seconds: float) -> None:
    inc("api_latency_sum", seconds)
    inc("api_latency_count", 1)


def prometheus_exposition() -> str:
    avg_latency = (
        _metrics["api_latency_sum"] / _metrics["api_latency_count"]
        if _metrics["api_latency_count"] else 0
    )
    lines = [
        "# HELP quantara_api_calls_total Total API requests",
        "# TYPE quantara_api_calls_total counter",
        f"quantara_api_calls_total {_metrics['api_calls_total']:.0f}",
        "# HELP quantara_groq_calls_total Total Groq LLM invocations",
        "# TYPE quantara_groq_calls_total counter",
        f"quantara_groq_calls_total {_metrics['groq_calls_total']:.0f}",
        "# HELP quantara_cache_hits_total Redis cache hits",
        "# TYPE quantara_cache_hits_total counter",
        f"quantara_cache_hits_total {_metrics['cache_hits_total']:.0f}",
        "# HELP quantara_cache_misses_total Redis cache misses",
        "# TYPE quantara_cache_misses_total counter",
        f"quantara_cache_misses_total {_metrics['cache_misses_total']:.0f}",
        "# HELP quantara_api_latency_seconds_avg Average request latency",
        "# TYPE quantara_api_latency_seconds_avg gauge",
        f"quantara_api_latency_seconds_avg {avg_latency:.4f}",
        "# HELP quantara_rag_queries_total SEC RAG vector searches",
        "# TYPE quantara_rag_queries_total counter",
        f"quantara_rag_queries_total {_metrics['rag_queries_total']:.0f}",
        "# HELP quantara_agent_runs_total Multi-agent orchestrator runs",
        "# TYPE quantara_agent_runs_total counter",
        f"quantara_agent_runs_total {_metrics['agent_runs_total']:.0f}",
    ]
    return "\n".join(lines) + "\n"


class RequestTimer:
    def __enter__(self):
        self._start = time.perf_counter()
        return self

    def __exit__(self, *args):
        observe_latency(time.perf_counter() - self._start)
