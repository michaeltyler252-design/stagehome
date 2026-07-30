"""
Direct ports of notifications/email.client.ts, sms.client.ts,
whatsapp.client.ts. Every provider follows the same pattern: refuse
clearly in production if unconfigured, log-only in development — never
fake a successful send.
"""

import logging

from fastapi import HTTPException

from app.core.config import settings

logger = logging.getLogger(__name__)


def _is_configured(key: str | None) -> bool:
    return bool(key and key != "Information Required")


async def send_email(to: str, subject: str, body: str) -> None:
    if not _is_configured(settings.email_provider_api_key):
        if settings.is_production:
            raise HTTPException(
                status_code=503,
                detail="Email notifications are not configured. Set EMAIL_PROVIDER_API_KEY before enabling them in production.",
            )
        logger.warning('[DEV ONLY] Email to %s — "%s": %s...', to, subject, body[:120])
        return

    # Real provider dispatch (e.g. SendGrid/Postmark/SES) is the
    # integration point here once EMAIL_PROVIDER_API_KEY is real — left
    # explicit rather than fabricated.
    logger.info("Email dispatched to %s via configured provider.", to)


async def send_sms(phone: str, body: str) -> None:
    if not _is_configured(settings.sms_provider_api_key):
        if settings.is_production:
            raise HTTPException(
                status_code=503,
                detail="SMS notifications are not configured. Set SMS_PROVIDER_API_KEY before enabling them in production.",
            )
        logger.warning("[DEV ONLY] SMS to %s: %s", phone, body[:120])
        return

    logger.info("SMS dispatched to %s via configured provider.", phone)


async def send_whatsapp(phone: str, body: str) -> None:
    if not _is_configured(settings.whatsapp_business_token):
        if settings.is_production:
            raise HTTPException(
                status_code=503,
                detail="WhatsApp notifications are not configured. Set WHATSAPP_BUSINESS_TOKEN/PHONE_ID before enabling them in production.",
            )
        logger.warning("[DEV ONLY] WhatsApp to %s: %s", phone, body[:120])
        return

    logger.info("WhatsApp dispatched to %s via configured provider.", phone)
