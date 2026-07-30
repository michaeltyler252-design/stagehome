"""
Google OAuth 2.0 — real implementation using authlib, matching the
original's passport-google-oauth20 flow: redirect to Google's consent
screen, exchange the returned code for tokens, use the verified email to
find-or-create a StageHome user, then issue our own session tokens
exactly like register()/login() do.

Honest note: this needs real GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET to
function at all, and the actual browser-driven redirect round-trip to
Google's servers can't be exercised from this sandbox (no way to
complete a real Google consent screen here). The token-exchange and
find-or-create-user logic below is written to be independently
unit-testable (see test_google_oauth_service.py) by mocking authlib's
own client — that part IS verified. The full end-to-end redirect flow
is not.
"""

from authlib.integrations.starlette_client import OAuth
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Role, User, UserRole

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


def is_configured() -> bool:
    return bool(settings.google_client_id and settings.google_client_secret)


async def find_or_create_user_from_google_profile(db: AsyncSession, email: str) -> User:
    """Given a verified email from Google's own ID token, finds the
    matching StageHome user or creates a new one (email_verified=True
    immediately, since Google already verified it) with the default
    Tenant role — same default-role rule as a normal registration."""
    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if user is not None:
        return user

    user = User(email=email, email_verified=True, status="ACTIVE")
    db.add(user)
    await db.flush()

    tenant_role = (await db.execute(select(Role).where(Role.name == "Tenant"))).scalar_one_or_none()
    if tenant_role is not None:
        db.add(UserRole(user_id=user.id, role_id=tenant_role.id))

    await db.commit()
    await db.refresh(user)
    return user


async def handle_callback(db: AsyncSession, request) -> User:
    if not is_configured():
        raise HTTPException(
            status_code=503,
            detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET before enabling it.",
        )

    token = await oauth.google.authorize_access_token(request)
    userinfo = token.get("userinfo")
    if not userinfo or not userinfo.get("email"):
        raise HTTPException(status_code=401, detail="Google did not return a verified email address.")

    return await find_or_create_user_from_google_profile(db, userinfo["email"])
