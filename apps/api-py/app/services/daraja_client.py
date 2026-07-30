"""
Direct port of payments/daraja.client.ts.

Every credential this needs (DARAJA_CONSUMER_KEY, DARAJA_CONSUMER_SECRET,
DARAJA_PASSKEY, DARAJA_SHORTCODE) is unset until a real Daraja account is
provisioned. Rather than fake a successful response when unconfigured,
every method refuses clearly, the same pattern the other notification
clients use for their own missing credentials.
"""

import base64
import logging
from datetime import datetime, timezone
from typing import TypedDict

import httpx
from fastapi import HTTPException

from app.core.config import settings

logger = logging.getLogger(__name__)


class StkPushRequest(TypedDict):
    phone: str
    amount: float
    account_reference: str
    transaction_desc: str
    callback_url: str


class StkPushResponse(TypedDict):
    merchant_request_id: str
    checkout_request_id: str
    response_code: str
    response_description: str


def _is_configured() -> bool:
    key = settings.daraja_consumer_key
    return bool(key and key != "Information Required")


def _base_url() -> str:
    return "https://api.safaricom.co.ke" if settings.daraja_env == "production" else "https://sandbox.safaricom.co.ke"


async def _get_access_token() -> str:
    credentials = base64.b64encode(
        f"{settings.daraja_consumer_key}:{settings.daraja_consumer_secret}".encode()
    ).decode()

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{_base_url()}/oauth/v1/generate?grant_type=client_credentials",
            headers={"Authorization": f"Basic {credentials}"},
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=503, detail="Could not authenticate with the M-Pesa Daraja API.")
    return response.json()["access_token"]


async def initiate_stk_push(request: StkPushRequest) -> StkPushResponse:
    if not _is_configured():
        raise HTTPException(
            status_code=503,
            detail=(
                "M-Pesa payment collection is not yet configured. Set DARAJA_CONSUMER_KEY, "
                "DARAJA_CONSUMER_SECRET, DARAJA_PASSKEY, and DARAJA_SHORTCODE before enabling payments."
            ),
        )

    shortcode = settings.daraja_shortcode
    passkey = settings.daraja_passkey
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode()

    access_token = await _get_access_token()

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{_base_url()}/mpesa/stkpush/v1/processrequest",
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
            json={
                "BusinessShortCode": shortcode,
                "Password": password,
                "Timestamp": timestamp,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": round(request["amount"]),
                "PartyA": request["phone"],
                "PartyB": shortcode,
                "PhoneNumber": request["phone"],
                "CallBackURL": request["callback_url"],
                "AccountReference": request["account_reference"],
                "TransactionDesc": request["transaction_desc"],
            },
        )

    if response.status_code >= 400:
        logger.error("Daraja STK push failed: %s", response.text)
        raise HTTPException(status_code=503, detail="M-Pesa could not process this payment request.")

    data = response.json()
    return {
        "merchant_request_id": data["MerchantRequestID"],
        "checkout_request_id": data["CheckoutRequestID"],
        "response_code": data["ResponseCode"],
        "response_description": data["ResponseDescription"],
    }
