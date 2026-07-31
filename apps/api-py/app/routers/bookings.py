"""Direct port of bookings/bookings.controller.ts."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AuthenticatedUser, get_current_user
from app.services import bookings_service

router = APIRouter(tags=["bookings"])


class CreateQuoteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    move_in_date: datetime | None = None


class BookingGuestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    full_name: str
    phone: str | None = None


class ConfirmBookingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    guests: list[BookingGuestRequest] | None = None


def _serialize_quote(q):
    return {
        "id": q.id,
        "unitId": q.unit_id,
        "moveInDate": q.move_in_date,
        "quotedRent": str(q.quoted_rent),
        "quotedDeposit": str(q.quoted_deposit) if q.quoted_deposit else None,
        "quotedFees": str(q.quoted_fees) if q.quoted_fees else None,
        "expiresAt": q.expires_at,
    }


def _serialize_hold(h):
    return {"id": h.id, "bookingQuoteId": h.booking_quote_id, "expiresAt": h.expires_at}


def _serialize_booking(b):
    return {
        "id": b.id,
        "unitId": b.unit_id,
        "userId": b.user_id,
        "status": b.status,
        "moveInDate": b.move_in_date,
        "agreedRent": str(b.agreed_rent),
        "agreedDeposit": str(b.agreed_deposit) if b.agreed_deposit else None,
        "createdAt": b.created_at,
    }


@router.post("/units/{unit_id}/quotes", status_code=201)
async def create_quote(
    unit_id: str,
    body: CreateQuoteRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    quote = await bookings_service.create_quote(db, user.user_id, unit_id, body.move_in_date)
    return _serialize_quote(quote)


@router.post("/quotes/{quote_id}/hold", status_code=201)
async def create_hold(
    quote_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hold = await bookings_service.create_hold(db, user.user_id, quote_id)
    return _serialize_hold(hold)


@router.post("/holds/{hold_id}/confirm", status_code=201)
async def confirm_booking(
    hold_id: str,
    body: ConfirmBookingRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    guests = [{"fullName": g.full_name, "phone": g.phone} for g in (body.guests or [])]
    booking = await bookings_service.confirm_booking(db, user, hold_id, guests)
    return _serialize_booking(booking)


@router.post("/bookings/{booking_id}/cancel")
async def cancel_booking(
    booking_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    booking = await bookings_service.cancel_booking(db, user, booking_id)
    return _serialize_booking(booking)


@router.get("/bookings/mine")
async def list_mine(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    bookings = await bookings_service.list_my_bookings(db, user.user_id, limit, offset)
    return [_serialize_booking(b) for b in bookings]
