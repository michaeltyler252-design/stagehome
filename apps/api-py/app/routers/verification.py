"""Direct port of verification.controller.ts, property-promotion.controller.ts,
and university-verification.controller.ts — consolidated into one router
since all three share the same prefix and Admin-only guard."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AuthenticatedUser, get_current_user, require_roles
from app.services import verification_service

router = APIRouter(prefix="/admin/verification", tags=["verification"], dependencies=[Depends(require_roles("Admin"))])


class RejectRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reason: str


class PromoteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    county_slug: str | None = None


class VerifyUniversityRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    method: str | None = None
    evidence_url: str | None = None
    notes: str | None = None


def _serialize_property(p):
    return {"id": p.id, "title": p.title, "slug": p.slug, "publicationStatus": p.publication_status, "verificationStatus": p.verification_status}


def _serialize_university(u):
    return {"id": u.id, "officialName": u.official_name, "slug": u.slug, "verificationStatus": u.verification_status}


# --- Property verification queue ---

@router.get("/queue")
async def list_queue(db: AsyncSession = Depends(get_db)):
    props = await verification_service.list_review_queue(db)
    return [_serialize_property(p) for p in props]


@router.post("/properties/{property_id}/approve")
async def approve(property_id: str, user: AuthenticatedUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    prop = await verification_service.approve_property(db, property_id, user.user_id)
    return _serialize_property(prop)


@router.post("/properties/{property_id}/publish")
async def publish(property_id: str, user: AuthenticatedUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    prop = await verification_service.publish_property(db, property_id, user.user_id)
    return _serialize_property(prop)


@router.post("/properties/{property_id}/reject")
async def reject(property_id: str, body: RejectRequest, user: AuthenticatedUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    prop = await verification_service.reject_property(db, property_id, user.user_id, body.reason)
    return _serialize_property(prop)


# --- Property promotion (staging -> public) ---

@router.get("/properties/promotion-queue")
async def list_property_promotion_queue(db: AsyncSession = Depends(get_db)):
    records = await verification_service.list_property_promotion_queue(db)
    return [{"id": r.id, "propertyName": r.property_name, "universityName": r.university_name, "sourceFile": r.source_file, "conflictStatus": r.conflict_status} for r in records]


@router.post("/properties/{raw_property_record_id}/promote")
async def promote_property(
    raw_property_record_id: str, body: PromoteRequest,
    user: AuthenticatedUser = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    prop = await verification_service.promote_property(db, raw_property_record_id, user.user_id, body.county_slug)
    return _serialize_property(prop)


# --- University promotion + verification ---

@router.get("/universities/promotion-queue")
async def list_university_promotion_queue(db: AsyncSession = Depends(get_db)):
    records = await verification_service.list_university_promotion_queue(db)
    return [{"id": r.id, "universityName": r.university_name, "campusName": r.campus_name, "sourceFile": r.source_file} for r in records]


@router.get("/universities/verification-queue")
async def list_university_verification_queue(db: AsyncSession = Depends(get_db)):
    unis = await verification_service.list_university_verification_queue(db)
    return [_serialize_university(u) for u in unis]


@router.post("/universities/{raw_university_record_id}/promote")
async def promote_university(
    raw_university_record_id: str, body: PromoteRequest,
    user: AuthenticatedUser = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    uni = await verification_service.promote_university(db, raw_university_record_id, user.user_id, body.county_slug)
    return _serialize_university(uni)


@router.post("/universities/{university_id}/verify")
async def verify_university(
    university_id: str, body: VerifyUniversityRequest,
    user: AuthenticatedUser = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    uni = await verification_service.verify_university(db, university_id, user.user_id, body.method, body.evidence_url, body.notes)
    return _serialize_university(uni)


@router.post("/universities/{university_id}/reject")
async def reject_university(
    university_id: str, body: RejectRequest,
    user: AuthenticatedUser = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    uni = await verification_service.reject_university(db, university_id, user.user_id, body.reason)
    return _serialize_university(uni)
