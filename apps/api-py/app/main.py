"""
Direct port of apps/api/src/main.ts's bootstrap() function.
"""

from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.core.config import settings
from app.core.cors_origin_matcher import is_allowed_origin
from app.routers import auth, favourites, health, notifications, public, stubs


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Equivalent of helmet() in the original — same CSP/HSTS-style
    defaults for a JSON API (no inline scripts/styles served here)."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        return response


class CorsMiddleware(BaseHTTPMiddleware):
    """Direct port of main.ts's app.enableCors({ origin: (origin, cb) => ... }).

    Reimplemented as explicit middleware (rather than relying solely on
    Starlette's CORSMiddleware, which only supports a static list or a
    single regex) so the exact same is_allowed_origin() function — with
    its own dedicated, ported test suite — is what actually decides every
    request, matching the original 1:1 rather than approximating it.
    """

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin")
        explicit_origins = (
            settings.web_app_origin.split(",") if settings.web_app_origin else ["http://localhost:3000"]
        )
        allowed = origin is not None and is_allowed_origin(origin, explicit_origins)

        if request.method == "OPTIONS":
            response = Response(status_code=204)
        else:
            response = await call_next(request)

        if allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
        return response


def create_app() -> FastAPI:
    if not settings.web_app_origin and settings.is_production:
        # Same fail-loudly behavior as the original: refuse to boot in
        # production with no configured frontend origin, rather than
        # silently blocking all cross-origin traffic.
        raise RuntimeError(
            "WEB_APP_ORIGIN is not set. Set it to the deployed frontend's exact origin "
            "before starting in production — otherwise CORS silently blocks every "
            "cross-origin request from the frontend, including registration and login."
        )

    app = FastAPI(
        title="StageHome API",
        version="0.1.0",
        docs_url="/api/v1/docs",
        openapi_url="/api/v1/openapi.json",
    )

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(CorsMiddleware)

    app.include_router(health.router, prefix="/api/v1")
    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(public.router, prefix="/api/v1")
    app.include_router(favourites.router, prefix="/api/v1")
    app.include_router(notifications.router, prefix="/api/v1")
    app.include_router(stubs.router, prefix="/api/v1")

    return app


app = create_app()
