from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.models import Payment, PaymentCallback, Refund
from app.services import payments_service


def _mock_scalar_result(value):
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    result.scalar_one.return_value = value
    return result


def _mock_scalars_list(values):
    result = MagicMock()
    scalars = MagicMock()
    scalars.first.return_value = values[0] if values else None
    scalars.all.return_value = values
    result.scalars.return_value = scalars
    return result


@pytest.mark.asyncio
async def test_initiate_is_idempotent_returns_existing_payment_for_same_key():
    """The exact real-money guarantee this exists for: calling initiate
    twice with the same idempotency key must never double-charge."""
    db = AsyncMock()
    existing_payment = Payment(id="payment-1", idempotency_key="key-1", status="SUCCEEDED")
    db.execute.return_value = _mock_scalar_result(existing_payment)

    class FakeUser:
        user_id = "user-1"

    result = await payments_service.initiate(
        db, FakeUser(), "booking-1", "254700000000", "https://example.com/callback", "key-1"
    )

    assert result.id == "payment-1"
    # Must short-circuit before ever touching Daraja or creating a new payment.
    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_handle_callback_is_replay_safe_and_does_not_reprocess():
    """The exact real-money guarantee this exists for: Daraja is known to
    retry callbacks — a duplicate must never post a second ledger entry
    or double-confirm a booking."""
    db = AsyncMock()
    existing_callback = PaymentCallback(id="cb-1", provider_ref="ws_CO_123")
    db.execute.return_value = _mock_scalar_result(existing_callback)

    result = await payments_service.handle_callback(
        db, {"Body": {"stkCallback": {"CheckoutRequestID": "ws_CO_123", "ResultCode": 0}}}
    )

    assert result == {"received": True, "alreadyProcessed": True}


@pytest.mark.asyncio
async def test_handle_callback_rejects_a_malformed_payload():
    db = AsyncMock()
    with pytest.raises(HTTPException) as exc_info:
        await payments_service.handle_callback(db, {"Body": {}})
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_handle_callback_logs_and_does_not_crash_on_unrecognized_checkout_request():
    db = AsyncMock()
    # First execute: no existing callback. Second: no matching attempt.
    db.execute.side_effect = [_mock_scalar_result(None), _mock_scalars_list([])]

    result = await payments_service.handle_callback(
        db, {"Body": {"stkCallback": {"CheckoutRequestID": "unknown-id", "ResultCode": 0}}}
    )

    assert result == {"received": True, "alreadyProcessed": False}


@pytest.mark.asyncio
async def test_request_refund_rejects_a_payment_that_never_succeeded():
    db = AsyncMock()
    payment = Payment(id="payment-1", status="PENDING")
    db.execute.return_value = _mock_scalar_result(payment)

    with pytest.raises(HTTPException) as exc_info:
        await payments_service.request_refund(db, "payment-1", 1000, "reason", "user-1")

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_request_refund_flags_dual_control_above_threshold():
    db = AsyncMock()
    payment = Payment(id="payment-1", status="SUCCEEDED")
    db.execute.return_value = _mock_scalar_result(payment)

    refund = await payments_service.request_refund(db, "payment-1", 60000, "reason", "user-1")

    assert refund.requires_dual_control is True


@pytest.mark.asyncio
async def test_request_refund_does_not_flag_dual_control_below_threshold():
    db = AsyncMock()
    payment = Payment(id="payment-1", status="SUCCEEDED")
    db.execute.return_value = _mock_scalar_result(payment)

    refund = await payments_service.request_refund(db, "payment-1", 5000, "reason", "user-1")

    assert refund.requires_dual_control is False


@pytest.mark.asyncio
async def test_approve_refund_rejects_the_same_person_who_requested_it():
    """The exact guarantee "dual control" means: enforced, not just
    documented. One person cannot approve their own high-value refund
    request."""
    db = AsyncMock()
    refund = Refund(id="refund-1", requires_dual_control=True, requested_by="user-1", approved_by=None)
    db.execute.return_value = _mock_scalar_result(refund)

    with pytest.raises(HTTPException) as exc_info:
        await payments_service.approve_refund(db, "refund-1", "user-1")

    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_approve_refund_allows_a_different_approver():
    db = AsyncMock()
    refund = Refund(id="refund-1", requires_dual_control=True, requested_by="user-1", approved_by=None)
    db.execute.return_value = _mock_scalar_result(refund)

    result = await payments_service.approve_refund(db, "refund-1", "user-2")

    assert result.approved_by == "user-2"


@pytest.mark.asyncio
async def test_approve_refund_rejects_an_already_approved_refund():
    db = AsyncMock()
    refund = Refund(id="refund-1", requires_dual_control=False, requested_by="user-1", approved_by="user-2")
    db.execute.return_value = _mock_scalar_result(refund)

    with pytest.raises(HTTPException) as exc_info:
        await payments_service.approve_refund(db, "refund-1", "user-3")

    assert exc_info.value.status_code == 400
