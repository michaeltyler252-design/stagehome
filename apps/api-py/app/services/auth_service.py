"""
Direct port of apps/api/src/auth/auth.service.ts's register/login/refresh
flow. Kept as plain functions taking an AsyncSession, mirroring the
original's constructor-injected PrismaService — this makes it directly
unit-testable with a mocked session, the same way the original tests mock
PrismaService rather than hitting a real database.
"""

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    hash_password,
    hash_token,
    sign_access_token,
    sign_refresh_token,
    verify_password,
)
from app.models import User, UserProfile, UserRole, Role, UserSession


async def load_role_names(db: AsyncSession, user_id: str) -> list[str]:
    result = await db.execute(
        select(Role.name).join(UserRole, UserRole.role_id == Role.id).where(UserRole.user_id == user_id)
    )
    return [row[0] for row in result.all()]


async def _issue_session_tokens(
    db: AsyncSession,
    user_id: str,
    email: str | None,
    roles: list[str],
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> tuple[str, str]:
    access_token = sign_access_token(user_id, email, roles)
    refresh_token, session_id = sign_refresh_token(user_id)

    db.add(
        UserSession(
            id=session_id,
            user_id=user_id,
            refresh_token=hash_token(refresh_token),
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        )
    )
    await db.commit()

    return access_token, refresh_token


async def register(
    db: AsyncSession,
    first_name: str,
    last_name: str,
    email: str,
    password: str,
    phone: str | None,
) -> tuple[str, str, User, list[str]]:
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")

    user = User(email=email, phone=phone, password_hash=hash_password(password))
    db.add(user)
    await db.flush()  # populate user.id before creating dependent rows

    db.add(UserProfile(user_id=user.id, first_name=first_name, last_name=last_name))

    # Every new registration is a Tenant by default — matches the original
    # ("Every registration always assigns 'Tenant' role").
    tenant_role = (await db.execute(select(Role).where(Role.name == "Tenant"))).scalar_one_or_none()
    if tenant_role is not None:
        db.add(UserRole(user_id=user.id, role_id=tenant_role.id))

    await db.commit()

    roles = await load_role_names(db, user.id)
    access_token, refresh_token = await _issue_session_tokens(db, user.id, user.email, roles)
    return access_token, refresh_token, user, roles


async def login(db: AsyncSession, email: str, password: str) -> tuple[str, str, User, list[str]]:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    # Same message whether the email doesn't exist or the password is
    # wrong — never reveal which one it was.
    invalid = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    if user is None or user.password_hash is None:
        raise invalid
    if not verify_password(user.password_hash, password):
        raise invalid

    roles = await load_role_names(db, user.id)
    access_token, refresh_token = await _issue_session_tokens(db, user.id, user.email, roles)
    return access_token, refresh_token, user, roles


async def refresh(db: AsyncSession, refresh_token: str) -> tuple[str, str]:
    """Exchanges a valid, non-revoked, non-expired refresh token for a new
    access token + refresh token pair (rotation: the old session is
    revoked and a new one issued, so a stolen refresh token can only ever
    be used once before its replacement invalidates it)."""
    from app.core.security import JWTError, verify_refresh_token

    invalid = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token.")

    try:
        payload = verify_refresh_token(refresh_token)
    except JWTError:
        raise invalid

    session_id = payload.get("sessionId")
    user_id = payload.get("sub")
    if not session_id or not user_id:
        raise invalid

    session = (await db.execute(select(UserSession).where(UserSession.id == session_id))).scalar_one_or_none()
    if session is None or session.revoked_at is not None:
        raise invalid

    now = datetime.now(session.expires_at.tzinfo) if session.expires_at.tzinfo else datetime.now()
    if session.expires_at < now:
        raise invalid

    # The presented token must actually match what's on record for this
    # session (hashed comparison) — a session row existing isn't enough
    # on its own; the caller must actually possess the real token.
    if session.refresh_token != hash_token(refresh_token):
        raise invalid

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise invalid

    # Rotate: revoke the old session, issue a brand new one.
    session.revoked_at = datetime.now(timezone.utc)
    await db.commit()

    roles = await load_role_names(db, user.id)
    new_access_token, new_refresh_token = await _issue_session_tokens(db, user.id, user.email, roles)
    return new_access_token, new_refresh_token


async def logout(db: AsyncSession, refresh_token: str) -> None:
    """Revokes the session tied to this refresh token, so it (and any
    future access token minted from it) can no longer be used."""
    from app.core.security import JWTError, verify_refresh_token

    try:
        payload = verify_refresh_token(refresh_token)
    except JWTError:
        # An already-invalid/expired token is, functionally, already
        # logged out — succeed quietly rather than error.
        return

    session_id = payload.get("sessionId")
    if not session_id:
        return

    session = (await db.execute(select(UserSession).where(UserSession.id == session_id))).scalar_one_or_none()
    if session is not None and session.revoked_at is None:
        session.revoked_at = datetime.now(timezone.utc)
        await db.commit()
