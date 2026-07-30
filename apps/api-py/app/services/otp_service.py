"""
Phone OTP verification service. Uses Redis (matching the pattern already
established in bookings_service.py for the unit-hold lock) to store a
short-lived, hashed OTP code — no new database table needed for
something this ephemeral.

Sends the code via the existing SmsClient (notification_clients.py),
which itself already refuses clearly in production if SMS isn't
configured, and logs-only in development — the same honest pattern used
throughout this project rather than fabricating a successful send.
"""

import hashlib
import random

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis_client import get_redis_client
from app.models import User
from app.services import notification_clients

OTP_TTL_SECONDS = 300  # 5 minutes
OTP_MAX_ATTEMPTS = 5


def _redis_key(phone: str) -> str:
    return f"otp:{phone}"


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


async def request_otp(phone: str) -> None:
    code = f"{random.randint(0, 999999):06d}"
    redis_client = get_redis_client()
    await redis_client.set(_redis_key(phone), _hash_code(code), ex=OTP_TTL_SECONDS)
    # Reset any prior attempt counter for this phone.
    await redis_client.delete(f"{_redis_key(phone)}:attempts")

    await notification_clients.send_sms(phone, f"Your StageHome verification code is {code}. It expires in 5 minutes.")


async def verify_otp(db: AsyncSession, phone: str, code: str) -> None:
    """Marks the user's phone as verified once the code matches. Rate-limits
    attempts (max 5) per requested code, so a leaked/predictable code can't
    be brute-forced within its 5-minute window."""
    redis_client = get_redis_client()
    key = _redis_key(phone)
    stored_hash = await redis_client.get(key)

    if stored_hash is None:
        raise HTTPException(status_code=400, detail="No verification code was requested for this phone number, or it has expired. Request a new one.")

    attempts_key = f"{key}:attempts"
    attempts = await redis_client.incr(attempts_key)
    await redis_client.expire(attempts_key, OTP_TTL_SECONDS)

    if attempts > OTP_MAX_ATTEMPTS:
        await redis_client.delete(key)
        raise HTTPException(status_code=429, detail="Too many incorrect attempts. Request a new verification code.")

    if stored_hash != _hash_code(code):
        raise HTTPException(status_code=400, detail="Incorrect verification code.")

    await redis_client.delete(key)
    await redis_client.delete(attempts_key)

    user = (await db.execute(select(User).where(User.phone == phone))).scalar_one_or_none()
    if user is not None:
        user.phone_verified = True
        await db.commit()
