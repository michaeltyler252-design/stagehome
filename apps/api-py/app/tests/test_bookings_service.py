from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.models import BookingHold, BookingQuote
from app.services import bookings_service


def _mock_scalar_result(value):
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    result.scalar_one.return_value = value
    return result


@pytest.mark.asyncio
async def test_create_hold_rejects_when_redis_lock_is_already_held():
    """The real behavior this exists to guarantee: two renters can never
    simultaneously hold the same unit — SET NX must be atomic."""
    db = AsyncMock()
    quote = BookingQuote(
        id="quote-1", unit_id="unit-1", user_id="user-1",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.execute.return_value = _mock_scalar_result(quote)

    fake_redis = AsyncMock()
    fake_redis.set.return_value = None  # SET NX returned nothing = lock not acquired

    with patch("app.services.bookings_service.get_redis_client", return_value=fake_redis):
        with pytest.raises(HTTPException) as exc_info:
            await bookings_service.create_hold(db, "user-1", "quote-1")

    assert exc_info.value.status_code == 409
    fake_redis.set.assert_called_once()
    call_kwargs = fake_redis.set.call_args
    assert call_kwargs.kwargs["nx"] is True


@pytest.mark.asyncio
async def test_create_hold_rejects_a_quote_belonging_to_a_different_user():
    db = AsyncMock()
    quote = BookingQuote(
        id="quote-1", unit_id="unit-1", user_id="someone-else",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.execute.return_value = _mock_scalar_result(quote)

    with pytest.raises(HTTPException) as exc_info:
        await bookings_service.create_hold(db, "user-1", "quote-1")

    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_create_hold_rejects_an_expired_quote():
    db = AsyncMock()
    quote = BookingQuote(
        id="quote-1", unit_id="unit-1", user_id="user-1",
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
    )
    db.execute.return_value = _mock_scalar_result(quote)

    with pytest.raises(HTTPException) as exc_info:
        await bookings_service.create_hold(db, "user-1", "quote-1")

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_create_hold_succeeds_and_persists_a_real_hold_when_lock_acquired():
    db = AsyncMock()
    quote = BookingQuote(
        id="quote-1", unit_id="unit-1", user_id="user-1",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.execute.return_value = _mock_scalar_result(quote)

    fake_redis = AsyncMock()
    fake_redis.set.return_value = True  # lock acquired

    with patch("app.services.bookings_service.get_redis_client", return_value=fake_redis):
        hold = await bookings_service.create_hold(db, "user-1", "quote-1")

    assert hold.booking_quote_id == "quote-1"
    assert hold.lock_key.startswith("unit-hold:unit-1:")
    db.add.assert_called_once()
    db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_cancel_booking_rejects_a_booking_not_in_pending_payment():
    from app.models import Booking

    db = AsyncMock()
    booking = Booking(id="booking-1", user_id="user-1", status="CONFIRMED")
    db.execute.return_value = _mock_scalar_result(booking)

    class FakeUser:
        user_id = "user-1"
        roles = []

    with pytest.raises(HTTPException) as exc_info:
        await bookings_service.cancel_booking(db, FakeUser(), "booking-1")

    assert exc_info.value.status_code == 400
    assert "CONFIRMED" in exc_info.value.detail


@pytest.mark.asyncio
async def test_cancel_booking_rejects_a_different_users_booking():
    from app.models import Booking

    db = AsyncMock()
    booking = Booking(id="booking-1", user_id="someone-else", status="PENDING_PAYMENT")
    db.execute.return_value = _mock_scalar_result(booking)

    class FakeUser:
        user_id = "user-1"
        roles = []

    with pytest.raises(HTTPException) as exc_info:
        await bookings_service.cancel_booking(db, FakeUser(), "booking-1")

    assert exc_info.value.status_code == 403
