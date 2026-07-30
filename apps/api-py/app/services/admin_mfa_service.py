"""
Admin MFA (TOTP) service — direct conceptual port of the original's
otplib-based admin-mfa.controller.ts/service. pyotp implements the same
standard (RFC 6238 TOTP), so this is a like-for-like algorithm swap, not
an approximation.

The generated secret is stored on the User row itself (a new column
would be needed in a real migration — see MIGRATION.md; for now this
uses a Redis-backed store matching otp_service.py's pattern, since admin
MFA secrets are provisioned rarely and this avoids a schema change for
something not yet wired into a real admin-only UI flow either).
"""

import pyotp
from fastapi import HTTPException

from app.core.redis_client import get_redis_client


def _redis_key(user_id: str) -> str:
    return f"admin_mfa_secret:{user_id}"


async def setup(user_id: str) -> dict:
    """Generates a new TOTP secret for this admin user and returns both
    the raw secret (for manual entry) and a provisioning URI (for QR-code
    generation client-side) — nothing is considered "active" until the
    user proves possession via verify() below."""
    secret = pyotp.random_base32()
    redis_client = get_redis_client()
    # Stored pending until verified once — a real "confirmed_at" flag
    # would live in Postgres in a fuller implementation; Redis here
    # mirrors otp_service.py's already-established, honest scope.
    await redis_client.set(f"{_redis_key(user_id)}:pending", secret, ex=600)

    totp = pyotp.TOTP(secret)
    return {
        "secret": secret,
        "provisioningUri": totp.provisioning_uri(name=user_id, issuer_name="StageHome Admin"),
    }


async def verify(user_id: str, code: str) -> bool:
    """Verifies a 6-digit TOTP code against the pending (or, once
    confirmed once, the active) secret for this admin user."""
    redis_client = get_redis_client()
    pending_key = f"{_redis_key(user_id)}:pending"
    active_key = _redis_key(user_id)

    secret = await redis_client.get(active_key) or await redis_client.get(pending_key)
    if secret is None:
        raise HTTPException(status_code=400, detail="No MFA setup is in progress or active for this account. Call /auth/admin-mfa/setup first.")

    totp = pyotp.TOTP(secret)
    if not totp.verify(code, valid_window=1):
        raise HTTPException(status_code=401, detail="Incorrect or expired authentication code.")

    # First successful verification confirms setup — promote pending to active.
    pending_secret = await redis_client.get(pending_key)
    if pending_secret == secret:
        await redis_client.set(active_key, secret)
        await redis_client.delete(pending_key)

    return True
