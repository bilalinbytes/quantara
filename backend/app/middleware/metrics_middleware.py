from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app.services.metrics_service import inc, RequestTimer


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in ("/metrics", "/api/v1/metrics", "/health", "/healthz"):
            return await call_next(request)
        inc("api_calls_total")
        with RequestTimer():
            return await call_next(request)
