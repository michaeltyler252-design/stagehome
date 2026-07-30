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
