"""Direct port of payments/payments.service.ts."""

import logging
import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AuthenticatedUser
from app.models import (
    Booking,
    BookingInstallment,
    LedgerAccount,
    LedgerEntry,
    Payment,
    PaymentAllocation,
    PaymentAttempt,
    PaymentCallback,
    Receipt,
    Refund,
)
from app.services import daraja_client, notifications_service

logger = logging.getLogger(__name__)

# KES — above this, dual control is required.
LARGE_REFUND_THRESHOLD = 50000


async def initiate(
    db: AsyncSession, user: AuthenticatedUser, booking_id: str, phone: str, callback_url: str, idempotency_key: str | None
) -> Payment:
    """Initiates an M-Pesa STK push for a booking's next unpaid
    installment. Idempotent: calling this twice with the same
    idempotency_key returns the original payment rather than
    double-charging."""
    if idempotency_key:
        existing = (
            await db.execute(select(Payment).where(Payment.idempotency_key == idempotency_key))
        ).scalar_one_or_none()
        if existing is not None:
            return existing

    booking = (await db.execute(select(Booking).where(Booking.id == booking_id))).scalar_one_or_none()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if booking.user_id != user.user_id:
        raise HTTPException(status_code=403, detail="This booking belongs to a different account.")
    if booking.status != "PENDING_PAYMENT":
        raise HTTPException(status_code=400, detail=f'Cannot take payment for a booking in status "{booking.status}".')

    unpaid_installments = (
        await db.execute(
            select(BookingInstallment)
            .where(BookingInstallment.booking_id == booking_id, BookingInstallment.paid_at.is_(None))
            .order_by(BookingInstallment.sequence.asc())
        )
    ).scalars().all()
    next_installment = unpaid_installments[0] if unpaid_installments else None
    if next_installment is None:
        raise HTTPException(status_code=400, detail="This booking has no outstanding balance.")

    key = idempotency_key or uuid.uuid4().hex

    payment = Payment(
        booking_id=booking.id,
        provider="MPESA_STK",
        status="INITIATED",
        amount=next_installment.amount_due,
        idempotency_key=key,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    try:
        stk_response = await daraja_client.initiate_stk_push(
            {
                "phone": phone,
                "amount": float(next_installment.amount_due),
                "account_reference": booking.id,
                "transaction_desc": f"StageHome booking {booking.id}",
                "callback_url": callback_url,
            }
        )
        db.add(
            PaymentAttempt(
                payment_id=payment.id,
                provider_ref=stk_response["checkout_request_id"],
                status="PENDING",
                raw_response_json=dict(stk_response),
            )
        )
        payment.status = "PENDING"
        await db.commit()
        await db.refresh(payment)
        return payment
    except Exception as err:
        # Record the failed attempt rather than leaving the payment stuck
        # in INITIATED with no trace of what happened.
        db.add(
            PaymentAttempt(
                payment_id=payment.id,
                status="FAILED",
                raw_response_json={"error": str(err)},
            )
        )
        payment.status = "FAILED"
        await db.commit()
        raise


async def handle_callback(db: AsyncSession, payload: dict) -> dict:
    """Handles the Daraja STK callback. Replay-safe: payment_callbacks
    .provider_ref is unique, so a duplicate callback (Daraja is known to
    retry) is recorded but not reprocessed — no double ledger entry, no
    double-confirmed booking."""
    stk_callback = (payload or {}).get("Body", {}).get("stkCallback", {})
    checkout_request_id = stk_callback.get("CheckoutRequestID")
    result_code = stk_callback.get("ResultCode")

    if not checkout_request_id:
        raise HTTPException(status_code=400, detail="Malformed Daraja callback payload.")

    existing_callback = (
        await db.execute(select(PaymentCallback).where(PaymentCallback.provider_ref == checkout_request_id))
    ).scalar_one_or_none()
    if existing_callback is not None:
        return {"received": True, "alreadyProcessed": True}

    attempt = (
        await db.execute(select(PaymentAttempt).where(PaymentAttempt.provider_ref == checkout_request_id))
    ).scalars().first()
    if attempt is None:
        # A callback for a checkout request we never initiated (or
        # already cleaned up). PaymentCallback.payment is a required
        # relation — there is no real payment to attach this to, and
        # inventing one would be fabricating data. Log it for the audit
        # trail instead of persisting a callback row with no payment.
        logger.warning("Received a Daraja callback for an unrecognized checkout request: %s", checkout_request_id)
        return {"received": True, "alreadyProcessed": False}

    db.add(
        PaymentCallback(
            payment_id=attempt.payment_id,
            provider_ref=checkout_request_id,
            signature_valid=True,
            raw_payload_json=payload,
        )
    )
    await db.commit()

    payment = (await db.execute(select(Payment).where(Payment.id == attempt.payment_id))).scalar_one()

    if result_code != 0:
        payment.status = "FAILED"
        await db.commit()
        return {"received": True, "alreadyProcessed": False}

    await _mark_payment_succeeded(db, payment)
    return {"received": True, "alreadyProcessed": False}


async def _mark_payment_succeeded(db: AsyncSession, payment: Payment) -> None:
    payment.status = "SUCCEEDED"

    db.add(PaymentAllocation(payment_id=payment.id, allocation_type="rent", amount=payment.amount))

    booking = (await db.execute(select(Booking).where(Booking.id == payment.booking_id))).scalar_one()
    installments = (
        await db.execute(
            select(BookingInstallment)
            .where(BookingInstallment.booking_id == booking.id)
            .order_by(BookingInstallment.sequence.asc())
        )
    ).scalars().all()
    unpaid = [i for i in installments if i.paid_at is None]
    next_unpaid = unpaid[0] if unpaid else None

    from datetime import datetime, timezone

    if next_unpaid is not None:
        next_unpaid.paid_at = datetime.now(timezone.utc)

    db.add(Receipt(payment_id=payment.id))
    await db.commit()

    await notifications_service.notify(
        db,
        booking.user_id,
        "payment_receipt",
        "Payment received",
        f"We've received your payment of KES {float(payment.amount):,.0f}. Your receipt is attached to your booking.",
        {"paymentId": payment.id},
    )

    # Internal double-entry ledger. Every successful payment posts a
    # balanced entry: cash-in-transit (M-Pesa clearing) debited, revenue
    # credited — the two ledger_accounts are upserted by name so this
    # works from a fresh database without a separate seed step.
    clearing_account = (
        await db.execute(select(LedgerAccount).where(LedgerAccount.name == "M-Pesa Clearing"))
    ).scalar_one_or_none()
    if clearing_account is None:
        clearing_account = LedgerAccount(name="M-Pesa Clearing", type="asset")
        db.add(clearing_account)
        await db.flush()

    revenue_account = (
        await db.execute(select(LedgerAccount).where(LedgerAccount.name == "Rent Revenue"))
    ).scalar_one_or_none()
    if revenue_account is None:
        revenue_account = LedgerAccount(name="Rent Revenue", type="revenue")
        db.add(revenue_account)
        await db.flush()

    db.add(LedgerEntry(ledger_account_id=clearing_account.id, debit=payment.amount, reference_type="payment", reference_id=payment.id))
    db.add(LedgerEntry(ledger_account_id=revenue_account.id, credit=payment.amount, reference_type="payment", reference_id=payment.id))
    await db.commit()

    remaining_unpaid = [i for i in installments if (next_unpaid is None or i.id != next_unpaid.id) and i.paid_at is None]
    if len(remaining_unpaid) == 0:
        booking.status = "CONFIRMED"
        await db.commit()
        await notifications_service.notify(
            db,
            booking.user_id,
            "booking_confirmed",
            "Your booking is confirmed",
            "Your booking is fully paid and confirmed. Your tenancy agreement will follow shortly.",
            {"bookingId": booking.id},
        )


async def request_refund(db: AsyncSession, payment_id: str, amount: float, reason: str, requested_by: str) -> Refund:
    """Refunds above LARGE_REFUND_THRESHOLD are flagged for dual control.
    This only ever creates the flagged record; approve_refund below is
    the second, independent action required before money would actually
    move."""
    payment = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one_or_none()
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found.")
    if payment.status != "SUCCEEDED":
        raise HTTPException(status_code=400, detail="Only a succeeded payment can be refunded.")

    refund = Refund(
        payment_id=payment_id,
        amount=amount,
        reason=reason,
        requested_by=requested_by,
        requires_dual_control=amount >= LARGE_REFUND_THRESHOLD,
    )
    db.add(refund)
    await db.commit()
    await db.refresh(refund)
    return refund


async def approve_refund(db: AsyncSession, refund_id: str, approver_user_id: str) -> Refund:
    """The second, independent approval a dual-control refund requires.
    Refuses outright if the approver is the same person who requested it
    — "dual control" means two different people, not one person clicking
    twice, and that is enforced here, not just documented."""
    refund = (await db.execute(select(Refund).where(Refund.id == refund_id))).scalar_one_or_none()
    if refund is None:
        raise HTTPException(status_code=404, detail="Refund not found.")
    if refund.approved_by:
        raise HTTPException(status_code=400, detail="This refund has already been approved.")
    if refund.requires_dual_control and refund.requested_by == approver_user_id:
        raise HTTPException(
            status_code=403,
            detail="This refund requires dual control: the approver must be a different person from whoever requested it.",
        )

    refund.approved_by = approver_user_id
    await db.commit()
    await db.refresh(refund)
    return refund
