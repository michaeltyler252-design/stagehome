"""Direct port of agreements/agreements.controller.ts."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AuthenticatedUser, get_current_user
from app.services import agreements_service

router = APIRouter(tags=["agreements"])


@router.post("/bookings/{booking_id}/agreements", status_code=201)
async def generate(
    booking_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await agreements_service.generate(db, user, booking_id)


# Not behind the auth dependency — the token itself is the authentication,
# since a signatory reaches this from a link sent by email/SMS/WhatsApp,
# not an authenticated session.
@router.get("/agreements/sign/{token}")
async def get_by_token(token: str, request: Request, db: AsyncSession = Depends(get_db)):
    return await agreements_service.get_by_token(db, token, request.client.host if request.client else None)


@router.post("/agreements/sign/{token}")
async def sign(token: str, request: Request, db: AsyncSession = Depends(get_db)):
    return await agreements_service.sign(db, token, request.client.host if request.client else None)
