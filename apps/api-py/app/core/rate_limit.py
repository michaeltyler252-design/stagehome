"""
Shared slowapi Limiter instance, in its own module so both main.py (which
registers it on the app) and individual routers (which apply @limiter.limit
to specific endpoints) can import it without a circular import between
app.main and app.routers.auth.

Production-readiness audit finding: slowapi has been a listed dependency
since early in this project but was never actually imported or used
anywhere — zero rate limiting existed on any endpoint, including login,
register, and OTP request, all classic brute-force/abuse targets.
Backed by Redis (the same instance the rest of the app already uses) so
the limit is real and shared across every backend process, not just
per-process in-memory (which would be silently ineffective the moment
there's more than one uvicorn worker).
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

limiter = Limiter(key_func=get_remote_address, storage_uri=settings.redis_url)
