"""
Direct port of apps/api/src/auth/auth.controller.ts.

Fully implemented and tested: register, login, refresh, logout, phone
OTP, admin MFA (TOTP). Google OAuth remains genuinely unported — see
MIGRATION.md for exactly why (it requires a real, external OAuth
round-trip that can't be meaningfully unit-tested the way everything
else here has been, and needs real Google client credentials to even
attempt).
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AuthenticatedUser, get_current_user
from app.core.security import verify_access_token
from app.models import User
from app.schemas.auth import AuthResponse, LoginRequest, RefreshRequest, RegisterRequest, UserOut
from app.services import admin_mfa_service, auth_service, otp_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    access_token, refresh_token, user, roles = await auth_service.register(
        db, body.first_name, body.last_name, body.email, body.password, body.phone
    )
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserOut(id=user.id, email=user.email, phone=user.phone, roles=roles),
    )


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    access_token, refresh_token, user, roles = await auth_service.login(db, body.email, body.password)
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserOut(id=user.id, email=user.email, phone=user.phone, roles=roles),
    )


@router.post("/refresh", response_model=AuthResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    new_access_token, new_refresh_token = await auth_service.refresh(db, body.refresh_token)
    claims = verify_access_token(new_access_token)
    user = (await db.execute(select(User).where(User.id == claims["sub"]))).scalar_one()
    return AuthResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        user=UserOut(id=user.id, email=user.email, phone=user.phone, roles=claims["roles"]),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    await auth_service.logout(db, body.refresh_token)
    return None


class OtpRequestBody(BaseModel):
    phone: str


class OtpVerifyBody(BaseModel):
    phone: str
    code: str


@router.post("/otp/request", status_code=status.HTTP_204_NO_CONTENT)
async def request_otp(body: OtpRequestBody):
    await otp_service.request_otp(body.phone)
    return None


@router.post("/otp/verify", status_code=status.HTTP_204_NO_CONTENT)
async def verify_otp(body: OtpVerifyBody, db: AsyncSession = Depends(get_db)):
    await otp_service.verify_otp(db, body.phone, body.code)
    return None


class AdminMfaVerifyBody(BaseModel):
    code: str


@router.post("/admin-mfa/setup")
async def admin_mfa_setup(user: AuthenticatedUser = Depends(get_current_user)):
    return await admin_mfa_service.setup(user.user_id)


@router.post("/admin-mfa/verify")
async def admin_mfa_verify(body: AdminMfaVerifyBody, user: AuthenticatedUser = Depends(get_current_user)):
    ok = await admin_mfa_service.verify(user.user_id, body.code)
    return {"verified": ok}


# --- Google OAuth ---
# Real implementation (authlib) — see google_oauth_service.py's own
# docstring for exactly what is and isn't verifiable in this sandbox:
# the find-or-create-user logic is unit-tested for real; the actual
# browser redirect round-trip to Google's servers is not (and cannot be,
# without a real browser and real Google credentials).

@router.get("/google")
async def google_login(request: Request):
    from app.services.google_oauth_service import is_configured, oauth

    if not is_configured():
        raise HTTPException(status_code=503, detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.")
    redirect_uri = request.url_for("google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback", name="google_callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Real bug found and fixed during the architecture audit: this endpoint
    used to return AuthResponse (raw JSON tokens) directly. But Google
    redirects the user's browser straight to THIS FastAPI endpoint, not
    back to Laravel — so Laravel's session (where every other auth flow
    in this project stores tokens) would never have received them; the
    browser would just show a bare JSON blob on the API's own domain.

    Fixed the same way any API-plus-separate-frontend OAuth flow has to:
    generate a short-lived, one-time exchange code, store the real tokens
    against it in Redis (same pattern already used for OTP codes and
    booking-hold locks), and redirect the browser to the frontend with
    just that code — never with the tokens themselves in the URL, where
    they'd leak into browser history and referrer headers. The frontend
    then calls POST /auth/google/exchange once, server-to-server, to
    trade the code for the real tokens.
    """
    from app.core.config import settings
    from app.core.redis_client import get_redis_client
    from app.core.security import hash_token, sign_access_token, sign_refresh_token
    from app.models import UserSession
    from app.services.google_oauth_service import handle_callback
    from datetime import datetime, timedelta, timezone
    from fastapi.responses import RedirectResponse
    import json
    import uuid

    user = await handle_callback(db, request)
    roles = await auth_service.load_role_names(db, user.id)

    access_token = sign_access_token(user.id, user.email, roles)
    refresh_token, session_id = sign_refresh_token(user.id)
    db.add(UserSession(
        id=session_id, user_id=user.id, refresh_token=hash_token(refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    ))
    await db.commit()

    exchange_code = uuid.uuid4().hex
    redis_client = get_redis_client()
    await redis_client.set(
        f"oauth-exchange:{exchange_code}",
        json.dumps({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {"id": user.id, "email": user.email, "phone": user.phone, "roles": roles},
        }),
        ex=60,  # one-time, short-lived — the frontend must exchange it within 60 seconds
        nx=True,
    )

    frontend_origin = (settings.web_app_origin or "http://localhost:8000").split(",")[0]
    return RedirectResponse(url=f"{frontend_origin}/auth/google/callback?code={exchange_code}")


class GoogleExchangeBody(BaseModel):
    code: str


@router.post("/google/exchange", response_model=AuthResponse)
async def google_exchange(body: GoogleExchangeBody):
    """The second half of the fix above: the frontend calls this once,
    server-to-server, with the one-time code from the redirect — trading
    it for the real tokens. The code is deleted on first use (GETDEL),
    so it can never be replayed even if it leaked somehow."""
    from app.core.redis_client import get_redis_client
    import json

    redis_client = get_redis_client()
    key = f"oauth-exchange:{body.code}"
    raw = await redis_client.getdel(key)
    if raw is None:
        raise HTTPException(status_code=400, detail="This sign-in link has expired or was already used. Please sign in with Google again.")

    data = json.loads(raw)
    return AuthResponse(
        access_token=data["access_token"],
        refresh_token=data["refresh_token"],
        user=UserOut(**data["user"]),
    )
