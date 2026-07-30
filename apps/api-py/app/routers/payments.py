"""Direct port of payments/payments.controller.ts."""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AuthenticatedUser, get_current_user, require_roles
from app.services import payments_service

router = APIRouter(prefix="/payments", tags=["payments"])


class InitiatePaymentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    booking_id: str
    phone: str = Field(pattern=r"^2547[0-9]{8}$", description="MSISDN, e.g. 2547XXXXXXXX")
    idempotency_key: str | None = None


class RefundRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    amount: float
    reason: str


def _serialize_payment(p):
    return {
        "id": p.id,
        "bookingId": p.booking_id,
        "provider": p.provider,
        "status": p.status,
        "amount": str(p.amount),
        "idempotencyKey": p.idempotency_key,
    }


@router.post("/initiate")
async def initiate(
    body: InitiatePaymentRequest,
    request: Request,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    callback_url = f"{request.url.scheme}://{request.headers.get('host')}/api/v1/payments/callback/mpesa"
    payment = await payments_service.initiate(
        db, user, body.booking_id, body.phone, callback_url, body.idempotency_key
    )
    return _serialize_payment(payment)


@router.post("/callback/mpesa")
async def mpesa_callback(payload: dict, db: AsyncSession = Depends(get_db)):
    """Daraja's webhook target. Deliberately NOT behind the auth
    dependency — M-Pesa cannot present a StageHome bearer token. This
    callback is the ONLY thing allowed to move a payment to SUCCEEDED; a
    browser redirect back from a payment page must never do so."""
    return await payments_service.handle_callback(db, payload)


@router.post("/{payment_id}/refund", dependencies=[Depends(require_roles("Admin", "Accountant"))])
async def request_refund(
    payment_id: str,
    body: RefundRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    refund = await payments_service.request_refund(db, payment_id, body.amount, body.reason, user.user_id)
    return {
        "id": refund.id,
        "paymentId": refund.payment_id,
        "amount": str(refund.amount),
        "requiresDualControl": refund.requires_dual_control,
        "requestedBy": refund.requested_by,
        "approvedBy": refund.approved_by,
    }


@router.post("/refunds/{refund_id}/approve", dependencies=[Depends(require_roles("Admin"))])
async def approve_refund(
    refund_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    refund = await payments_service.approve_refund(db, refund_id, user.user_id)
    return {"id": refund.id, "approvedBy": refund.approved_by}
