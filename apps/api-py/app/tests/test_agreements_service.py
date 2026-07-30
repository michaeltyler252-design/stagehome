from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.models import Agreement, Booking
from app.services import agreements_service


def _mock_scalar_result(value):
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    result.scalar_one.return_value = value
    return result


def _mock_scalars_list(values):
    result = MagicMock()
    scalars = MagicMock()
    scalars.all.return_value = values
    result.scalars.return_value = scalars
    return result


@pytest.mark.asyncio
async def test_generate_refuses_a_booking_that_is_not_confirmed():
    db = AsyncMock()
    booking = Booking(id="booking-1", user_id="user-1", status="PENDING_PAYMENT")
    db.execute.return_value = _mock_scalar_result(booking)

    class FakeUser:
        user_id = "user-1"
        roles = []

    with pytest.raises(HTTPException) as exc_info:
        await agreements_service.generate(db, FakeUser(), "booking-1")

    assert exc_info.value.status_code == 400
    assert "CONFIRMED" in exc_info.value.detail


@pytest.mark.asyncio
async def test_generate_refuses_to_replace_an_already_sealed_agreement():
    """The exact legal guarantee this exists for: a fully-signed
    agreement is never silently regenerated/replaced."""
    db = AsyncMock()
    booking = Booking(id="booking-1", user_id="user-1", status="CONFIRMED")
    sealed_agreement = Agreement(id="agreement-1", booking_id="booking-1", status="FULLY_SIGNED")

    db.execute.side_effect = [
        _mock_scalar_result(booking),
        _mock_scalars_list([sealed_agreement]),
    ]

    class FakeUser:
        user_id = "user-1"
        roles = []

    with pytest.raises(HTTPException) as exc_info:
        await agreements_service.generate(db, FakeUser(), "booking-1")

    assert exc_info.value.status_code == 400
    assert "never silently replaced" in exc_info.value.detail
