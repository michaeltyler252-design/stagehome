"""Direct port of bookings/bookings.service.ts."""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AuthenticatedUser
from app.core.redis_client import get_redis_client
from app.models import (
    Booking,
    BookingGuest,
    BookingHold,
    BookingInstallment,
    BookingQuote,
    Deposit,
    Fee,
    HouseRule,
    PricingRule,
    Property,
    Unit,
)

QUOTE_TTL_MINUTES = 30
HOLD_TTL_MINUTES = 15


async def create_quote(
    db: AsyncSession, user_id: str, unit_id: str, move_in_date: datetime | None
) -> BookingQuote:
    """A renter can only quote a unit whose property is actually PUBLISHED —
    the booking-side enforcement mirroring the public search API's own scope."""
    unit = (await db.execute(select(Unit).where(Unit.id == unit_id))).scalar_one_or_none()
    if unit is None:
        raise HTTPException(status_code=404, detail="This unit is not available to book.")

    prop = (await db.execute(select(Property).where(Property.id == unit.property_id))).scalar_one_or_none()
    if prop is None or prop.publication_status != "PUBLISHED":
        raise HTTPException(status_code=404, detail="This unit is not available to book.")

    unit_pricing = (
        await db.execute(select(PricingRule).where(PricingRule.unit_id == unit_id))
    ).scalars().first()
    property_pricing = (
        await db.execute(select(PricingRule).where(PricingRule.property_id == prop.id))
    ).scalars().first()
    pricing_rule = unit_pricing or property_pricing
    if pricing_rule is None:
        raise HTTPException(status_code=400, detail="This unit does not have pricing configured yet.")

    deposit = (
        await db.execute(select(Deposit).where(Deposit.property_id == prop.id))
    ).scalars().first()
    booking_fee = (
        await db.execute(select(Fee).where(Fee.property_id == prop.id, Fee.fee_type == "booking_fee"))
    ).scalars().first()

    quote = BookingQuote(
        unit_id=unit_id,
        user_id=user_id,
        move_in_date=move_in_date,
        quoted_rent=pricing_rule.rent_amount_min,
        quoted_deposit=deposit.amount if deposit else None,
        quoted_fees=booking_fee.amount if booking_fee else None,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=QUOTE_TTL_MINUTES),
    )
    db.add(quote)
    await db.commit()
    await db.refresh(quote)
    return quote


async def create_hold(db: AsyncSession, user_id: str, quote_id: str) -> BookingHold:
    """Places a short reservation lock on the unit in Redis so two renters
    can't simultaneously hold the same unit. Uses SET NX so lock
    acquisition is atomic — no race condition between "check if locked"
    and "set the lock"."""
    quote = (await db.execute(select(BookingQuote).where(BookingQuote.id == quote_id))).scalar_one_or_none()
    if quote is None:
        raise HTTPException(status_code=404, detail="Quote not found.")
    if quote.user_id and quote.user_id != user_id:
        raise HTTPException(status_code=403, detail="This quote belongs to a different account.")
    now = datetime.now(quote.expires_at.tzinfo) if quote.expires_at.tzinfo else datetime.now()
    if quote.expires_at < now:
        raise HTTPException(status_code=400, detail="This quote has expired. Request a new one.")

    redis_client = get_redis_client()
    lock_key = f"unit-hold:{quote.unit_id}"
    lock_token = uuid.uuid4().hex

    acquired = await redis_client.set(lock_key, lock_token, px=HOLD_TTL_MINUTES * 60 * 1000, nx=True)
    if not acquired:
        raise HTTPException(
            status_code=409, detail="This unit is currently held by another renter. Try again in a few minutes."
        )

    hold = BookingHold(
        booking_quote_id=quote_id,
        lock_key=f"{lock_key}:{lock_token}",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=HOLD_TTL_MINUTES),
    )
    db.add(hold)
    await db.commit()
    await db.refresh(hold)
    return hold


async def confirm_booking(
    db: AsyncSession, user: AuthenticatedUser, hold_id: str, guests: list[dict]
) -> Booking:
    """Converts a hold into a real booking. Pricing/policy figures are
    copied onto the booking as policy_snapshot_json at this exact moment —
    once frozen here, a manager cannot retroactively change a confirmed
    booking's price or policy."""
    hold = (await db.execute(select(BookingHold).where(BookingHold.id == hold_id))).scalar_one_or_none()
    if hold is None:
        raise HTTPException(status_code=404, detail="Hold not found.")
    now = datetime.now(hold.expires_at.tzinfo) if hold.expires_at.tzinfo else datetime.now()
    if hold.expires_at < now:
        raise HTTPException(status_code=400, detail="This hold has expired. Start again from a new quote.")

    quote = (await db.execute(select(BookingQuote).where(BookingQuote.id == hold.booking_quote_id))).scalar_one()
    unit = (await db.execute(select(Unit).where(Unit.id == quote.unit_id))).scalar_one_or_none()
    if unit is None:
        raise HTTPException(status_code=404, detail="Unit no longer exists.")

    house_rules = (await db.execute(select(HouseRule).where(HouseRule.property_id == unit.property_id))).scalars().all()
    deposit = (await db.execute(select(Deposit).where(Deposit.property_id == unit.property_id))).scalars().first()

    booking = Booking(
        unit_id=quote.unit_id,
        user_id=user.user_id,
        status="PENDING_PAYMENT",
        move_in_date=quote.move_in_date,
        agreed_rent=quote.quoted_rent,
        agreed_deposit=quote.quoted_deposit,
        policy_snapshot_json={
            "houseRules": [{"ruleType": r.rule_type, "detail": r.detail} for r in house_rules],
            "depositPolicy": {"amount": str(deposit.amount), "basis": deposit.basis} if deposit else None,
            "frozenAt": datetime.now(timezone.utc).isoformat(),
        },
    )
    db.add(booking)
    await db.flush()

    for guest in guests or []:
        db.add(BookingGuest(booking_id=booking.id, full_name=guest["fullName"], phone=guest.get("phone")))

    # Same scope as the original: a single full-rent installment. Real
    # multi-installment plans are a payment-integration concern, once a
    # real provider can collect them.
    db.add(
        BookingInstallment(
            booking_id=booking.id,
            sequence=1,
            amount_due=quote.quoted_rent,
            due_date=quote.move_in_date or datetime.now(timezone.utc),
        )
    )
    await db.commit()
    await db.refresh(booking)

    # The hold's job is done — release the Redis lock immediately rather
    # than waiting for its TTL.
    redis_client = get_redis_client()
    lock_key_base = ":".join(hold.lock_key.split(":")[:2])
    await redis_client.delete(lock_key_base)

    return booking


async def cancel_booking(db: AsyncSession, user: AuthenticatedUser, booking_id: str) -> Booking:
    booking = (await db.execute(select(Booking).where(Booking.id == booking_id))).scalar_one_or_none()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if booking.user_id != user.user_id and "Admin" not in user.roles:
        raise HTTPException(status_code=403, detail="This booking belongs to a different account.")
    if booking.status != "PENDING_PAYMENT":
        raise HTTPException(
            status_code=400,
            detail=(
                f'Cannot cancel a booking in status "{booking.status}". Only PENDING_PAYMENT bookings '
                "can be self-cancelled before payment (the refund workflow governs post-payment cancellation)."
            ),
        )

    booking.status = "CANCELLED"
    await db.commit()
    await db.refresh(booking)
    return booking


async def list_my_bookings(db: AsyncSession, user_id: str, limit: int = 50, offset: int = 0) -> list[Booking]:
    result = await db.execute(
        select(Booking).where(Booking.user_id == user_id).order_by(Booking.created_at.desc()).limit(limit).offset(offset)
    )
    return list(result.scalars().all())
