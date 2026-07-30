"""Direct port of reviews/reviews.service.ts."""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AuthenticatedUser
from app.models import (
    Booking,
    OrganisationMember,
    Property,
    Review,
    ReviewCategory,
    ReviewResponse,
    Unit,
)

REVIEW_CATEGORY_KEYS = [
    "accuracy", "security", "water", "internet", "cleanliness", "management", "value", "distance",
]


async def create_for_booking(
    db: AsyncSession, user: AuthenticatedUser, booking_id: str, overall_rating: float, categories: list[dict]
) -> Review:
    """Only the tenant on a COMPLETED booking may review the stay, and
    only once per booking — the "verified stays only" rule."""
    booking = (await db.execute(select(Booking).where(Booking.id == booking_id))).scalar_one_or_none()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if booking.user_id != user.user_id:
        raise HTTPException(status_code=403, detail="You can only review your own bookings.")
    if booking.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="A stay can only be reviewed once the booking is marked COMPLETED.")

    existing_reviews = (await db.execute(select(Review).where(Review.booking_id == booking_id))).scalars().all()
    if len(existing_reviews) > 0:
        raise HTTPException(status_code=409, detail="This booking has already been reviewed.")

    unit = (await db.execute(select(Unit).where(Unit.id == booking.unit_id))).scalar_one()

    review = Review(property_id=unit.property_id, booking_id=booking.id, user_id=user.user_id, overall_rating=overall_rating)
    db.add(review)
    await db.flush()

    for c in categories:
        db.add(ReviewCategory(review_id=review.id, category=c["category"], rating=c["rating"]))

    await db.commit()
    await db.refresh(review)
    return review


async def respond(db: AsyncSession, user: AuthenticatedUser, review_id: str, body: str) -> ReviewResponse:
    """A manager (member of the property's organisation) or Admin may
    respond once, publicly, to a review."""
    review = (await db.execute(select(Review).where(Review.id == review_id))).scalar_one_or_none()
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found.")

    prop = (await db.execute(select(Property).where(Property.id == review.property_id))).scalar_one()

    if "Admin" not in user.roles:
        membership = (
            await db.execute(
                select(OrganisationMember).where(
                    OrganisationMember.organisation_id == prop.organisation_id,
                    OrganisationMember.user_id == user.user_id,
                )
            )
        ).scalar_one_or_none()
        if membership is None:
            raise HTTPException(status_code=403, detail="You do not manage the property this review is about.")

    response = ReviewResponse(review_id=review_id, responder_id=user.user_id, body=body)
    db.add(response)
    await db.commit()
    await db.refresh(response)
    return response


async def list_for_property(db: AsyncSession, property_id: str) -> list[Review]:
    result = await db.execute(select(Review).where(Review.property_id == property_id).order_by(Review.created_at.desc()))
    return list(result.scalars().all())
