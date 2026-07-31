"""
Direct port of apps/api/src/main.ts's bootstrap() function.
"""

import logging

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sentry_sdk.integrations.fastapi import FastApiIntegration
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import Response

from app.core.config import settings
from app.core.cors_origin_matcher import is_allowed_origin
from app.core.rate_limit import limiter
from app.routers import (
    agreements,
    auth,
    blog,
    bookings,
    dashboards,
    favourites,
    health,
    notifications,
    organisations,
    payments,
    properties,
    public,
    reviews,
    stubs,
    support,
    verification,
)

# Production-readiness audit finding: LOG_LEVEL was defined in Settings
# but never actually applied anywhere — every logging.getLogger() call
# throughout the app was relying on Python's default root logger, which
# silently drops anything below WARNING. This makes the configured level
# real.
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

# Production-readiness audit finding: sentry-sdk was a listed dependency
# and SENTRY_DSN a documented environment variable, but Sentry was never
# actually initialized anywhere — error tracking was completely
# non-functional despite appearing available. Same pattern as every
# other optional integration in this project: only activates when a
# real DSN is configured, silent no-op otherwise (sentry_sdk.init with
# no dsn is itself a safe no-op, but this makes the "not configured"
# state explicit rather than relying on that implicitly).
if settings.sentry_dsn:
    sentry_sdk.init(dsn=settings.sentry_dsn, integrations=[FastApiIntegration()], traces_sample_rate=0.1)
    logger.info("Sentry error tracking initialized.")
else:
    logger.info("SENTRY_DSN not set — error tracking disabled (errors are still logged locally).")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Equivalent of helmet() in the original — same CSP/HSTS-style
    defaults for a JSON API (no inline scripts/styles served here).

    Also the actual, reliable place unhandled exceptions get caught:
    production-readiness audit finding — a bare @app.exception_handler
    was tried first, but Starlette's BaseHTTPMiddleware.call_next() can
    let an exception bypass it entirely (confirmed by actually crashing
    a request against an unreachable database: the exception propagated
    all the way out of the ASGI call itself, past the app-level handler,
    as a raw unhandled Python exception — not a JSON 500). Catching here,
    in the outermost middleware's own dispatch(), is what actually works,
    verified by reproducing the exact same crash and confirming a clean
    JSON 500 now instead."""

    async def dispatch(self, request: Request, call_next):
        try:
            response: Response = await call_next(request)
        except Exception as exc:
            logger.error("Unhandled exception on %s %s", request.method, request.url.path, exc_info=exc)
            if settings.sentry_dsn:
                sentry_sdk.capture_exception(exc)
            return JSONResponse(status_code=500, content={"detail": "An unexpected error occurred."})

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
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(CorsMiddleware)
    # Required by authlib's Google OAuth flow (stores state/nonce between
    # the redirect and callback). Uses the same JWT access secret as a
    # signing key — a distinct SESSION_SECRET could be introduced later
    # without any other change.
    app.add_middleware(SessionMiddleware, secret_key=settings.jwt_access_secret)

    app.include_router(health.router, prefix="/api/v1")
    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(public.router, prefix="/api/v1")
    app.include_router(favourites.router, prefix="/api/v1")
    app.include_router(notifications.router, prefix="/api/v1")
    app.include_router(organisations.router, prefix="/api/v1")
    app.include_router(properties.router, prefix="/api/v1")
    app.include_router(bookings.router, prefix="/api/v1")
    app.include_router(payments.router, prefix="/api/v1")
    app.include_router(agreements.router, prefix="/api/v1")
    app.include_router(reviews.router, prefix="/api/v1")
    app.include_router(blog.router, prefix="/api/v1")
    app.include_router(support.router, prefix="/api/v1")
    app.include_router(dashboards.router, prefix="/api/v1")
    app.include_router(verification.router, prefix="/api/v1")
    app.include_router(stubs.router, prefix="/api/v1")

    return app


app = create_app()
