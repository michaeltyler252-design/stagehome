"""Direct port of apps/api/src/notifications/notification-preferences.controller.ts,
including the notifications/mine endpoint fixed this session (rows were
being written on every send but were never readable back)."""

from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AuthenticatedUser, get_current_user
from app.models import Notification, NotificationPreference

router = APIRouter(tags=["notifications"])


class UpdateNotificationPreferenceRequest(BaseModel):
    email_opt_in: bool | None = None
    sms_opt_in: bool | None = None
    whatsapp_opt_in: bool | None = None


@router.get("/notification-preferences/mine")
async def get_my_preferences(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pref = (
        await db.execute(select(NotificationPreference).where(NotificationPreference.user_id == user.user_id))
    ).scalar_one_or_none()
    if pref is None:
        # Schema-default values if the user has never saved preferences yet.
        return {"userId": user.user_id, "emailOptIn": True, "smsOptIn": True, "whatsappOptIn": False}
    return {
        "userId": pref.user_id,
        "emailOptIn": pref.email_opt_in,
        "smsOptIn": pref.sms_opt_in,
        "whatsappOptIn": pref.whatsapp_opt_in,
    }


@router.put("/notification-preferences/mine")
async def update_my_preferences(
    body: UpdateNotificationPreferenceRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pref = (
        await db.execute(select(NotificationPreference).where(NotificationPreference.user_id == user.user_id))
    ).scalar_one_or_none()

    if pref is None:
        pref = NotificationPreference(
            user_id=user.user_id,
            email_opt_in=body.email_opt_in if body.email_opt_in is not None else True,
            sms_opt_in=body.sms_opt_in if body.sms_opt_in is not None else True,
            whatsapp_opt_in=body.whatsapp_opt_in if body.whatsapp_opt_in is not None else False,
        )
        db.add(pref)
    else:
        if body.email_opt_in is not None:
            pref.email_opt_in = body.email_opt_in
        if body.sms_opt_in is not None:
            pref.sms_opt_in = body.sms_opt_in
        if body.whatsapp_opt_in is not None:
            pref.whatsapp_opt_in = body.whatsapp_opt_in

    await db.commit()
    return {
        "userId": pref.user_id,
        "emailOptIn": pref.email_opt_in,
        "smsOptIn": pref.sms_opt_in,
        "whatsappOptIn": pref.whatsapp_opt_in,
    }


@router.get("/notifications/mine")
async def list_my_notifications(
    limit: int = Query(default=50, ge=1, le=100),
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notifications = (
        await db.execute(
            select(Notification)
            .where(Notification.user_id == user.user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    return [
        {
            "id": n.id,
            "channel": n.channel,
            "type": n.type,
            "payload": n.payload_json,
            "sentAt": n.sent_at,
            "createdAt": n.created_at,
        }
        for n in notifications
    ]
