"""Direct port of support/support.service.ts."""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AuthenticatedUser
from app.models import SupportMessage, SupportTicket
from app.services import notifications_service


async def create_ticket(db: AsyncSession, user: AuthenticatedUser, subject: str, body: str, priority: str | None) -> SupportTicket:
    ticket = SupportTicket(user_id=user.user_id, subject=subject, priority=priority or "P4", status="OPEN")
    db.add(ticket)
    await db.flush()
    db.add(SupportMessage(ticket_id=ticket.id, author_id=user.user_id, body=body))
    await db.commit()
    await db.refresh(ticket)
    return ticket


async def add_message(db: AsyncSession, user: AuthenticatedUser, ticket_id: str, body: str) -> SupportMessage:
    ticket = (await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))).scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    if ticket.user_id != user.user_id and "Admin" not in user.roles:
        raise HTTPException(status_code=403, detail="This ticket belongs to a different account.")

    message = SupportMessage(ticket_id=ticket_id, author_id=user.user_id, body=body)
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


async def list_mine(db: AsyncSession, user_id: str) -> list[SupportTicket]:
    result = await db.execute(select(SupportTicket).where(SupportTicket.user_id == user_id).order_by(SupportTicket.created_at.desc()))
    return list(result.scalars().all())


async def list_all(db: AsyncSession) -> list[SupportTicket]:
    result = await db.execute(select(SupportTicket).order_by(SupportTicket.priority.asc(), SupportTicket.created_at.asc()))
    return list(result.scalars().all())


async def update_status(db: AsyncSession, ticket_id: str, status: str) -> SupportTicket:
    """Admin-only status transition. Notifies the ticket's owner via
    their opted-in channels — they find out their ticket moved without
    having to poll."""
    ticket = (await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))).scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    ticket.status = status
    await db.commit()
    await db.refresh(ticket)

    await notifications_service.notify(
        db,
        ticket.user_id,
        "support_status",
        f"Update on your support ticket: {ticket.subject}",
        f'Your support ticket "{ticket.subject}" is now {status.replace("_", " ").lower()}.',
        {"ticketId": ticket_id, "status": status},
    )

    return ticket
