"""Direct port of verification/verification.service.ts,
property-promotion.service.ts, and university-verification.service.ts."""

import re
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    AuditLog,
    County,
    Organisation,
    Property,
    RawPropertyRecord,
    RawUniversityRecord,
    SourceRecord,
    University,
    VerificationEvent,
)

# See verification.service.ts's own long comment for why this is an
# explicit set, not a numeric rolloutPhase threshold.
APPROVED_COUNTY_SLUGS = ["nairobi-city", "kiambu", "nakuru"]

STAGING_COUNTY_NAME_ALIASES = {"Nairobi": "Nairobi City"}
SOURCE_SUPPLIED_ORGANISATION_NAME = "StageHome Verified Sources"


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


async def _resolve_county(db: AsyncSession, batch_county_name: str | None, county_slug_override: str | None) -> County:
    if county_slug_override:
        county = (await db.execute(select(County).where(County.slug == county_slug_override))).scalar_one_or_none()
        if county is None:
            raise HTTPException(status_code=400, detail=f'No county found with slug "{county_slug_override}".')
        return county

    if not batch_county_name:
        raise HTTPException(status_code=400, detail="This record's import batch has no county name recorded, and no countySlug override was given.")

    resolved_name = STAGING_COUNTY_NAME_ALIASES.get(batch_county_name, batch_county_name)
    county = (
        await db.execute(select(County).where(func.lower(County.name) == resolved_name.lower()))
    ).scalars().first()
    if county is None:
        raise HTTPException(
            status_code=400,
            detail=f'Could not automatically resolve county "{batch_county_name}" to a canonical county. Pass countySlug explicitly to resolve this.',
        )
    return county


# ============================================================
# Property verification (review queue: approve/publish/reject)
# ============================================================

async def list_review_queue(db: AsyncSession) -> list[Property]:
    result = await db.execute(select(Property).where(Property.publication_status == "REVIEW").order_by(Property.updated_at.asc()))
    return list(result.scalars().all())


async def approve_property(db: AsyncSession, property_id: str, admin_user_id: str) -> Property:
    prop = (await db.execute(select(Property).where(Property.id == property_id))).scalar_one_or_none()
    if prop is None:
        raise HTTPException(status_code=404, detail="Property not found.")
    if prop.publication_status != "REVIEW":
        raise HTTPException(status_code=400, detail=f'Cannot approve a property in status "{prop.publication_status}"; it must be in REVIEW.')
    if prop.conflict_status == "FLAGGED":
        raise HTTPException(status_code=400, detail="This property has an unresolved data conflict and cannot be approved until it is resolved.")

    previous_status = prop.verification_status
    prop.publication_status = "APPROVED"
    prop.verification_status = "VERIFIED"
    prop.verified_at = datetime.now(timezone.utc)
    prop.verified_by = admin_user_id

    db.add(VerificationEvent(entity_type="property", entity_id=property_id, previous_status=previous_status, new_status="VERIFIED", method="documentary", performed_by=admin_user_id))
    db.add(AuditLog(actor_id=admin_user_id, action="property.approve", entity_type="property", entity_id=property_id))
    await db.commit()
    await db.refresh(prop)
    return prop


async def publish_property(db: AsyncSession, property_id: str, admin_user_id: str) -> Property:
    prop = (await db.execute(select(Property).where(Property.id == property_id))).scalar_one_or_none()
    if prop is None:
        raise HTTPException(status_code=404, detail="Property not found.")
    if prop.publication_status != "APPROVED":
        raise HTTPException(status_code=400, detail=f'Cannot publish a property in status "{prop.publication_status}"; it must be APPROVED first.')

    county = (await db.execute(select(County).where(County.id == prop.county_id))).scalar_one()
    if county.slug not in APPROVED_COUNTY_SLUGS:
        raise HTTPException(
            status_code=400,
            detail=f"{county.name} has not been approved to launch yet. Currently approved counties: {', '.join(APPROVED_COUNTY_SLUGS)}.",
        )

    prop.publication_status = "PUBLISHED"
    db.add(AuditLog(actor_id=admin_user_id, action="property.publish", entity_type="property", entity_id=property_id))
    await db.commit()
    await db.refresh(prop)
    return prop


async def reject_property(db: AsyncSession, property_id: str, admin_user_id: str, reason: str) -> Property:
    prop = (await db.execute(select(Property).where(Property.id == property_id))).scalar_one_or_none()
    if prop is None:
        raise HTTPException(status_code=404, detail="Property not found.")

    previous_status = prop.verification_status
    prop.publication_status = "DRAFT"
    prop.verification_status = "REJECTED"
    prop.notes = reason

    db.add(VerificationEvent(entity_type="property", entity_id=property_id, previous_status=previous_status, new_status="REJECTED", method="documentary", performed_by=admin_user_id, notes=reason))
    db.add(AuditLog(actor_id=admin_user_id, action="property.reject", entity_type="property", entity_id=property_id, metadata_json={"reason": reason}))
    await db.commit()
    await db.refresh(prop)
    return prop


# ============================================================
# Property promotion (staging -> public.properties)
# ============================================================

async def list_property_promotion_queue(db: AsyncSession) -> list[RawPropertyRecord]:
    result = await db.execute(
        select(RawPropertyRecord).where(RawPropertyRecord.promoted_property_id.is_(None)).order_by(RawPropertyRecord.created_at.asc())
    )
    return list(result.scalars().all())


async def _get_or_create_source_supplied_organisation(db: AsyncSession) -> str:
    existing = (
        await db.execute(select(Organisation).where(Organisation.name == SOURCE_SUPPLIED_ORGANISATION_NAME))
    ).scalars().first()
    if existing:
        return existing.id
    created = Organisation(name=SOURCE_SUPPLIED_ORGANISATION_NAME, status="VERIFIED")
    db.add(created)
    await db.flush()
    return created.id


async def promote_property(db: AsyncSession, raw_property_record_id: str, admin_user_id: str, county_slug_override: str | None = None) -> Property:
    """Promotes one staged raw property record into public.properties, at
    publicationStatus REVIEW / verificationStatus PENDING. Never sets
    APPROVED or PUBLISHED — those stay explicit admin actions."""
    from app.models import RawImportBatch

    raw_record = (
        await db.execute(select(RawPropertyRecord).where(RawPropertyRecord.id == raw_property_record_id))
    ).scalar_one_or_none()
    if raw_record is None:
        raise HTTPException(status_code=404, detail="Raw property record not found.")
    if raw_record.promoted_property_id:
        raise HTTPException(status_code=400, detail="This record has already been promoted.")

    batch = (await db.execute(select(RawImportBatch).where(RawImportBatch.id == raw_record.batch_id))).scalar_one()
    county = await _resolve_county(db, batch.county, county_slug_override)
    organisation_id = await _get_or_create_source_supplied_organisation(db)

    slug_base = _slugify(raw_record.property_name)
    slug = slug_base
    if (await db.execute(select(Property).where(Property.slug == slug))).scalar_one_or_none():
        slug = f"{slug_base}-{uuid.uuid4().hex[:6]}"
    public_reference = f"SH-{uuid.uuid4().hex[:8].upper()}"

    prop = Property(
        organisation_id=organisation_id,
        county_id=county.id,
        title=raw_record.property_name,
        slug=slug,
        public_reference=public_reference,
        description=raw_record.raw_text,
        source_status="SOURCE_SUPPLIED",
        verification_status="PENDING",
        publication_status="REVIEW",
        source_file=raw_record.source_file,
        source_record_reference=raw_record.id,
        confidence_level="LOW",
        conflict_status=raw_record.conflict_status,
    )
    db.add(prop)
    await db.flush()

    source_record = SourceRecord(
        source_file=raw_record.source_file or "unknown",
        entity_type="property",
        entity_id=prop.id,
        raw_excerpt=raw_record.raw_text[:2000],
        import_batch=batch.batch_key,
    )
    db.add(source_record)
    await db.flush()

    db.add(VerificationEvent(
        source_record_id=source_record.id, entity_type="property", entity_id=prop.id,
        previous_status="UNVERIFIED", new_status="PENDING", performed_by=admin_user_id,
        notes=f"Promoted from staging raw property record {raw_record.id} (batch {batch.batch_key}).",
    ))
    raw_record.promoted_property_id = prop.id
    db.add(AuditLog(actor_id=admin_user_id, action="property.promote", entity_type="property", entity_id=prop.id, metadata_json={"rawPropertyRecordId": raw_record.id}))

    await db.commit()
    await db.refresh(prop)
    return prop


# ============================================================
# University verification (promotion + verify/reject)
# ============================================================

async def list_university_promotion_queue(db: AsyncSession) -> list[RawUniversityRecord]:
    result = await db.execute(
        select(RawUniversityRecord).where(RawUniversityRecord.promoted_university_id.is_(None)).order_by(RawUniversityRecord.created_at.asc())
    )
    return list(result.scalars().all())


async def list_university_verification_queue(db: AsyncSession) -> list[University]:
    result = await db.execute(select(University).where(University.verification_status == "PENDING").order_by(University.created_at.asc()))
    return list(result.scalars().all())


async def promote_university(db: AsyncSession, raw_university_record_id: str, admin_user_id: str, county_slug_override: str | None = None) -> University:
    from app.models import RawImportBatch

    raw_record = (
        await db.execute(select(RawUniversityRecord).where(RawUniversityRecord.id == raw_university_record_id))
    ).scalar_one_or_none()
    if raw_record is None:
        raise HTTPException(status_code=404, detail="Raw university record not found.")
    if raw_record.promoted_university_id:
        raise HTTPException(status_code=400, detail="This record has already been promoted.")

    existing = (
        await db.execute(select(University).where(func.lower(University.official_name) == raw_record.university_name.lower()))
    ).scalars().first()

    if existing:
        raw_record.promoted_university_id = existing.id
        db.add(AuditLog(actor_id=admin_user_id, action="university.attach_existing", entity_type="university", entity_id=existing.id, metadata_json={"rawUniversityRecordId": raw_record.id}))
        await db.commit()
        return existing

    batch = (await db.execute(select(RawImportBatch).where(RawImportBatch.id == raw_record.batch_id))).scalar_one()
    county = await _resolve_county(db, batch.county, county_slug_override)

    slug_base = _slugify(raw_record.university_name)
    slug = slug_base
    if (await db.execute(select(University).where(University.slug == slug))).scalar_one_or_none():
        slug = f"{slug_base}-{uuid.uuid4().hex[:6]}"

    university = University(
        county_id=county.id, official_name=raw_record.university_name, slug=slug,
        source_status="SOURCE_SUPPLIED", verification_status="PENDING", publication_status="DRAFT",
        source_file=raw_record.source_file, source_record_reference=raw_record.id, confidence_level="LOW",
    )
    db.add(university)
    await db.flush()

    source_record = SourceRecord(
        source_file=raw_record.source_file or "unknown", entity_type="university", entity_id=university.id,
        raw_excerpt=raw_record.raw_excerpt, import_batch=batch.batch_key,
    )
    db.add(source_record)
    await db.flush()

    db.add(VerificationEvent(
        source_record_id=source_record.id, entity_type="university", entity_id=university.id,
        previous_status="UNVERIFIED", new_status="PENDING", performed_by=admin_user_id,
        notes=f"Promoted from staging raw university record {raw_record.id} (batch {batch.batch_key}).",
    ))
    raw_record.promoted_university_id = university.id
    db.add(AuditLog(actor_id=admin_user_id, action="university.promote", entity_type="university", entity_id=university.id, metadata_json={"rawUniversityRecordId": raw_record.id}))

    await db.commit()
    await db.refresh(university)
    return university


async def verify_university(db: AsyncSession, university_id: str, admin_user_id: str, method: str | None = None, evidence_url: str | None = None, notes: str | None = None) -> University:
    university = (await db.execute(select(University).where(University.id == university_id))).scalar_one_or_none()
    if university is None:
        raise HTTPException(status_code=404, detail="University not found.")
    if university.verification_status != "PENDING":
        raise HTTPException(status_code=400, detail=f'Cannot verify a university in status "{university.verification_status}"; it must be PENDING (i.e. already promoted from staging).')

    university.verification_status = "VERIFIED"
    university.verified_at = datetime.now(timezone.utc)
    university.verified_by = admin_user_id
    university.accreditation_status = "Verified"

    db.add(VerificationEvent(
        entity_type="university", entity_id=university_id, previous_status="PENDING", new_status="VERIFIED",
        method=method or "documentary", performed_by=admin_user_id, evidence_url=evidence_url,
        notes=notes or "Confirmed against the Commission for University Education register.",
    ))
    db.add(AuditLog(actor_id=admin_user_id, action="university.verify", entity_type="university", entity_id=university_id))
    await db.commit()
    await db.refresh(university)
    return university


async def reject_university(db: AsyncSession, university_id: str, admin_user_id: str, reason: str) -> University:
    university = (await db.execute(select(University).where(University.id == university_id))).scalar_one_or_none()
    if university is None:
        raise HTTPException(status_code=404, detail="University not found.")
    if university.verification_status != "PENDING":
        raise HTTPException(status_code=400, detail=f'Cannot reject a university in status "{university.verification_status}"; it must be PENDING.')

    university.verification_status = "REJECTED"
    university.notes = reason

    db.add(VerificationEvent(entity_type="university", entity_id=university_id, previous_status="PENDING", new_status="REJECTED", performed_by=admin_user_id, notes=reason))
    db.add(AuditLog(actor_id=admin_user_id, action="university.reject", entity_type="university", entity_id=university_id, metadata_json={"reason": reason}))
    await db.commit()
    await db.refresh(university)
    return university
