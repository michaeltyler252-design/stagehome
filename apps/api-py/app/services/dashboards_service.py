"""Direct port of dashboards/dashboards.service.ts."""

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AuthenticatedUser
from app.models import (
    Booking,
    Favourite,
    OrganisationMember,
    Payment,
    Property,
    Refund,
    SavedSearch,
    SupportTicket,
    Unit,
    User,
)


async def tenant_dashboard(db: AsyncSession, user_id: str) -> dict:
    """Bookings, payments, agreements, support tickets — theirs only."""
    bookings = (
        await db.execute(select(Booking).where(Booking.user_id == user_id).order_by(Booking.created_at.desc()))
    ).scalars().all()
    support_tickets = (
        await db.execute(
            select(SupportTicket).where(SupportTicket.user_id == user_id).order_by(SupportTicket.created_at.desc()).limit(5)
        )
    ).scalars().all()
    favourites_count = (
        await db.execute(select(func.count()).select_from(Favourite).where(Favourite.user_id == user_id))
    ).scalar_one()
    saved_searches_count = (
        await db.execute(select(func.count()).select_from(SavedSearch).where(SavedSearch.user_id == user_id))
    ).scalar_one()

    active_bookings = sum(1 for b in bookings if b.status in ("PENDING_PAYMENT", "CONFIRMED"))

    return {
        "bookings": [{"id": b.id, "status": b.status, "agreedRent": str(b.agreed_rent)} for b in bookings],
        "supportTickets": [{"id": t.id, "subject": t.subject, "status": t.status} for t in support_tickets],
        "counts": {
            "activeBookings": active_bookings,
            "favourites": favourites_count,
            "savedSearches": saved_searches_count,
        },
    }


async def manager_dashboard(db: AsyncSession, user: AuthenticatedUser, organisation_id: str) -> dict:
    """Portfolio composition, verification pipeline status, recent
    bookings, and revenue — scoped to one organisation. Reuses the same
    membership check as properties_service so a manager can never see
    another organisation's numbers."""
    if "Admin" not in user.roles:
        membership = (
            await db.execute(
                select(OrganisationMember).where(
                    OrganisationMember.organisation_id == organisation_id,
                    OrganisationMember.user_id == user.user_id,
                )
            )
        ).scalar_one_or_none()
        if membership is None:
            raise HTTPException(status_code=403, detail="You do not have access to this organisation's dashboard.")

    properties_by_status_rows = (
        await db.execute(
            select(Property.publication_status, func.count())
            .where(Property.organisation_id == organisation_id)
            .group_by(Property.publication_status)
        )
    ).all()

    properties = (await db.execute(select(Property.id).where(Property.organisation_id == organisation_id))).scalars().all()
    total_units = (
        await db.execute(select(func.count()).select_from(Unit).where(Unit.property_id.in_(properties)))
    ).scalar_one() if properties else 0

    recent_bookings = (
        await db.execute(
            select(Booking)
            .join(Unit, Booking.unit_id == Unit.id)
            .join(Property, Unit.property_id == Property.id)
            .where(Property.organisation_id == organisation_id)
            .order_by(Booking.created_at.desc())
            .limit(10)
        )
    ).scalars().all()

    total_revenue = (
        await db.execute(
            select(func.sum(Payment.amount))
            .select_from(Payment)
            .join(Booking, Payment.booking_id == Booking.id)
            .join(Unit, Booking.unit_id == Unit.id)
            .join(Property, Unit.property_id == Property.id)
            .where(Payment.status == "SUCCEEDED", Property.organisation_id == organisation_id)
        )
    ).scalar_one()

    return {
        "propertiesByStatus": {status: count for status, count in properties_by_status_rows},
        "totalProperties": len(properties),
        "totalUnits": total_units,
        "recentBookings": [{"id": b.id, "status": b.status} for b in recent_bookings],
        "totalRevenue": str(total_revenue) if total_revenue else "0",
    }


async def admin_dashboard(db: AsyncSession) -> dict:
    """Platform-wide operational view."""
    properties_by_status_rows = (
        await db.execute(select(Property.publication_status, func.count()).group_by(Property.publication_status))
    ).all()
    flagged_conflicts = (
        await db.execute(select(func.count()).select_from(Property).where(Property.conflict_status == "FLAGGED"))
    ).scalar_one()
    verification_queue_count = (
        await db.execute(select(func.count()).select_from(Property).where(Property.publication_status == "REVIEW"))
    ).scalar_one()
    bookings_by_status_rows = (
        await db.execute(select(Booking.status, func.count()).group_by(Booking.status))
    ).all()
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    total_revenue = (
        await db.execute(select(func.sum(Payment.amount)).select_from(Payment).where(Payment.status == "SUCCEEDED"))
    ).scalar_one()
    refunds_pending_dual_control = (
        await db.execute(
            select(func.count()).select_from(Refund).where(Refund.requires_dual_control.is_(True), Refund.approved_by.is_(None))
        )
    ).scalar_one()
    support_by_priority_rows = (
        await db.execute(
            select(SupportTicket.priority, func.count())
            .where(SupportTicket.status.in_(["OPEN", "IN_PROGRESS"]))
            .group_by(SupportTicket.priority)
        )
    ).all()

    return {
        "propertiesByStatus": {status: count for status, count in properties_by_status_rows},
        "flaggedConflicts": flagged_conflicts,
        "verificationQueueCount": verification_queue_count,
        "bookingsByStatus": {status: count for status, count in bookings_by_status_rows},
        "totalUsers": total_users,
        "totalRevenue": str(total_revenue) if total_revenue else "0",
        "refundsPendingDualControl": refunds_pending_dual_control,
        "openSupportTicketsByPriority": {priority: count for priority, count in support_by_priority_rows},
    }
