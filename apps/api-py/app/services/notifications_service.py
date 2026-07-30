"""Direct port of notifications/notifications.service.ts's notify() method."""

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification, NotificationPreference, User
from app.services import notification_clients

logger = logging.getLogger(__name__)


async def notify(
    db: AsyncSession,
    user_id: str,
    notification_type: str,
    subject: str,
    body: str,
    payload: dict | None = None,
) -> None:
    """Dispatches a notification across every channel the user has opted
    into. Each channel is attempted independently — one channel's provider
    being unconfigured or failing never blocks the others, and every
    attempt (sent or not) is recorded as a Notification row for
    support/audit purposes."""
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        logger.warning("notify() called for a nonexistent user %s; skipping.", user_id)
        return

    preference = (
        await db.execute(select(NotificationPreference).where(NotificationPreference.user_id == user_id))
    ).scalar_one_or_none()
    email_opt_in = preference.email_opt_in if preference else True
    sms_opt_in = preference.sms_opt_in if preference else True
    whatsapp_opt_in = preference.whatsapp_opt_in if preference else False

    attempts = [
        {"channel": "email", "enabled": email_opt_in and bool(user.email), "send": lambda: notification_clients.send_email(user.email, subject, body)},
        {"channel": "sms", "enabled": sms_opt_in and bool(user.phone), "send": lambda: notification_clients.send_sms(user.phone, body)},
        {"channel": "whatsapp", "enabled": whatsapp_opt_in and bool(user.phone), "send": lambda: notification_clients.send_whatsapp(user.phone, body)},
    ]

    for attempt in attempts:
        if not attempt["enabled"]:
            continue

        notification = Notification(user_id=user_id, channel=attempt["channel"], type=notification_type, payload_json=payload)
        db.add(notification)
        await db.commit()
        await db.refresh(notification)

        try:
            await attempt["send"]()
            notification.sent_at = datetime.now(timezone.utc)
            await db.commit()
        except Exception as err:
            # A provider being unconfigured/down never throws out of
            # notify() itself — a notification failure must never break
            # the booking/payment/agreement flow that triggered it.
            logger.error(
                "Failed to send %s notification (%s) to user %s: %s",
                attempt["channel"], notification_type, user_id, err,
            )
