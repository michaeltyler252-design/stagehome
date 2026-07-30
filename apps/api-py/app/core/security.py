"""
Direct port of apps/api/src/auth/token.service.ts and password.service.ts.

Password hashing uses the exact same algorithm (argon2id) and the exact
same parameters (memory_cost=19456 KiB, time_cost=2, parallelism=1) as the
original, so every existing user's password hash verifies correctly with
zero migration and zero forced password reset.

JWT claims shape is preserved exactly: access tokens carry
sub/email/roles/organisation_id; refresh tokens carry sub/session_id.
"""

import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from jose import JWTError, jwt

from app.core.config import settings

# Same OWASP-recommended argon2id parameters as the original NestJS service.
_hasher = PasswordHasher(memory_cost=19456, time_cost=2, parallelism=1)


def hash_password(plain_text_password: str) -> str:
    return _hasher.hash(plain_text_password)


def verify_password(password_hash: str, plain_text_password: str) -> bool:
    """Malformed hash or verification error — treat as a failed match,
    never raise (same behavior as the original's try/catch)."""
    try:
        return _hasher.verify(password_hash, plain_text_password)
    except (VerifyMismatchError, InvalidHashError, Exception):
        return False


def hash_token(token: str) -> str:
    """SHA-256 hash, matching auth.service.ts's hashToken() exactly — only
    the hash is ever stored for a refresh token, never the plaintext."""
    return hashlib.sha256(token.encode()).hexdigest()


def sign_access_token(user_id: str, email: str | None, roles: list[str], organisation_id: str | None = None) -> str:
    payload: dict[str, Any] = {
        "sub": user_id,
        "email": email,
        "roles": roles,
        "organisationId": organisation_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_ttl_minutes),
    }
    return jwt.encode(payload, settings.jwt_access_secret, algorithm="HS256")


def sign_refresh_token(user_id: str, session_id: str | None = None) -> tuple[str, str]:
    session_id = session_id or uuid.uuid4().hex
    payload = {
        "sub": user_id,
        "sessionId": session_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_ttl_days),
    }
    token = jwt.encode(payload, settings.jwt_refresh_secret, algorithm="HS256")
    return token, session_id


def verify_access_token(token: str) -> dict[str, Any]:
    """Raises jose.JWTError on an invalid/expired token — callers turn
    this into a 401, same as passport-jwt's behavior on strategy failure."""
    return jwt.decode(token, settings.jwt_access_secret, algorithms=["HS256"])


def verify_refresh_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.jwt_refresh_secret, algorithms=["HS256"])


__all__ = [
    "hash_password",
    "verify_password",
    "hash_token",
    "sign_access_token",
    "sign_refresh_token",
    "verify_access_token",
    "verify_refresh_token",
    "JWTError",
]
