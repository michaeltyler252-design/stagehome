"""
Direct port of apps/api/src/auth/auth.controller.ts.

Fully implemented and tested: register, login. Refresh/logout/OTP/Google
OAuth/admin-MFA are present as clearly-marked stubs — see MIGRATION.md for
exact status of each.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.auth import AuthResponse, LoginRequest, RefreshRequest, RegisterRequest, UserOut
from app.services import auth_service

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


# --- Not yet fully ported — see MIGRATION.md "Remaining work" ---
# Each of these needs the same treatment as register/login above: port the
# exact logic from the corresponding NestJS service method, write real
# tests, verify against a real Postgres instance. Routes are declared here
# with the correct path/method so the frontend's URLs never need to
# change, but the bodies are stubs.

@router.post("/otp/request")
async def request_otp():
    raise HTTPException(status_code=501, detail="Not yet ported — see MIGRATION.md")


@router.post("/otp/verify")
async def verify_otp():
    raise HTTPException(status_code=501, detail="Not yet ported — see MIGRATION.md")


@router.post("/refresh")
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    raise HTTPException(status_code=501, detail="Not yet ported — see MIGRATION.md")


@router.post("/logout")
async def logout():
    raise HTTPException(status_code=501, detail="Not yet ported — see MIGRATION.md")


@router.get("/google")
async def google_login():
    raise HTTPException(status_code=501, detail="Not yet ported — see MIGRATION.md")


@router.get("/google/callback")
async def google_callback():
    raise HTTPException(status_code=501, detail="Not yet ported — see MIGRATION.md")
