"""Direct port of reviews/reviews.controller.ts."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AuthenticatedUser, get_current_user
from app.services.reviews_service import REVIEW_CATEGORY_KEYS, create_for_booking, list_for_property, respond

router = APIRouter(tags=["reviews"])


class ReviewCategoryRating(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category: str
    rating: float = Field(ge=1, le=5)

    @field_validator("category")
    @classmethod
    def validate_category(cls, v):
        if v not in REVIEW_CATEGORY_KEYS:
            raise ValueError(f"category must be one of {REVIEW_CATEGORY_KEYS}")
        return v


class CreateReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    overall_rating: float = Field(ge=1, le=5)
    categories: list[ReviewCategoryRating] = Field(min_length=1)


class CreateReviewResponseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    body: str = Field(min_length=2)


def _serialize_review(r):
    return {"id": r.id, "propertyId": r.property_id, "bookingId": r.booking_id, "overallRating": str(r.overall_rating), "createdAt": r.created_at}


@router.get("/public/properties/{property_id}/reviews")
async def list_for_property_route(property_id: str, db: AsyncSession = Depends(get_db)):
    reviews = await list_for_property(db, property_id)
    return [_serialize_review(r) for r in reviews]


@router.post("/bookings/{booking_id}/reviews", status_code=201)
async def create_for_booking_route(
    booking_id: str,
    body: CreateReviewRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    review = await create_for_booking(
        db, user, booking_id, body.overall_rating, [c.model_dump() for c in body.categories]
    )
    return _serialize_review(review)


@router.post("/reviews/{review_id}/responses", status_code=201)
async def respond_route(
    review_id: str,
    body: CreateReviewResponseRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    response = await respond(db, user, review_id, body.body)
    return {"id": response.id, "reviewId": response.review_id, "body": response.body, "createdAt": response.created_at}
