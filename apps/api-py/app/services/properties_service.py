"""Direct port of properties/properties.service.ts."""

import re
import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AuthenticatedUser
from app.models import OrganisationMember, Property, Unit


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


async def assert_can_manage_organisation(db: AsyncSession, user: AuthenticatedUser, organisation_id: str) -> None:
    if "Admin" in user.roles:
        return
    membership = (
        await db.execute(
            select(OrganisationMember).where(
                OrganisationMember.organisation_id == organisation_id,
                OrganisationMember.user_id == user.user_id,
            )
        )
    ).scalar_one_or_none()
    if membership is None:
        raise HTTPException(status_code=403, detail="You do not have access to this organisation's properties.")


async def get_organisation_id_for_property(db: AsyncSession, property_id: str) -> str:
    prop = (await db.execute(select(Property).where(Property.id == property_id))).scalar_one_or_none()
    if prop is None:
        raise HTTPException(status_code=404, detail="Property not found.")
    return prop.organisation_id


async def create_property(
    db: AsyncSession,
    user: AuthenticatedUser,
    organisation_id: str,
    title: str,
    county_id: str,
    town_id: str | None,
    estate_id: str | None,
    category_id: str | None,
    description: str | None,
    address: str | None,
    private_lat: float | None,
    private_lng: float | None,
) -> Property:
    await assert_can_manage_organisation(db, user, organisation_id)

    slug_base = slugify(title)
    public_reference = f"SH-{uuid.uuid4().hex[:8].upper()}"

    # Ensure slug uniqueness by appending a short suffix on collision
    # rather than failing the create outright.
    slug = slug_base
    existing = (await db.execute(select(Property).where(Property.slug == slug))).scalar_one_or_none()
    if existing is not None:
        slug = f"{slug_base}-{uuid.uuid4().hex[:6]}"

    prop = Property(
        organisation_id=organisation_id,
        county_id=county_id,
        town_id=town_id,
        estate_id=estate_id,
        category_id=category_id,
        title=title,
        slug=slug,
        public_reference=public_reference,
        description=description,
        address=address,
        private_lat=private_lat,
        private_lng=private_lng,
        # Every manager-created listing starts exactly where a
        # source-supplied one does: unverified and unpublished.
        source_status="MANAGER_SUPPLIED",
        verification_status="UNVERIFIED",
        publication_status="DRAFT",
    )
    db.add(prop)
    await db.commit()
    await db.refresh(prop)
    return prop


async def list_properties_for_organisation(db: AsyncSession, user: AuthenticatedUser, organisation_id: str) -> list[Property]:
    await assert_can_manage_organisation(db, user, organisation_id)
    result = await db.execute(
        select(Property).where(Property.organisation_id == organisation_id).order_by(Property.created_at.desc())
    )
    return list(result.scalars().all())


async def get_property(db: AsyncSession, user: AuthenticatedUser, property_id: str) -> Property:
    organisation_id = await get_organisation_id_for_property(db, property_id)
    await assert_can_manage_organisation(db, user, organisation_id)
    prop = (await db.execute(select(Property).where(Property.id == property_id))).scalar_one()
    return prop


async def update_property(db: AsyncSession, user: AuthenticatedUser, property_id: str, updates: dict) -> Property:
    organisation_id = await get_organisation_id_for_property(db, property_id)
    await assert_can_manage_organisation(db, user, organisation_id)

    prop = (await db.execute(select(Property).where(Property.id == property_id))).scalar_one()
    for field, value in updates.items():
        if value is not None:
            setattr(prop, field, value)
    await db.commit()
    await db.refresh(prop)
    return prop


async def submit_for_verification(db: AsyncSession, user: AuthenticatedUser, property_id: str) -> Property:
    organisation_id = await get_organisation_id_for_property(db, property_id)
    await assert_can_manage_organisation(db, user, organisation_id)

    prop = (await db.execute(select(Property).where(Property.id == property_id))).scalar_one()
    prop.publication_status = "REVIEW"
    await db.commit()
    await db.refresh(prop)
    return prop


async def add_unit(
    db: AsyncSession,
    user: AuthenticatedUser,
    property_id: str,
    category_id: str | None,
    public_label: str | None,
    bedrooms: int | None,
    bathrooms: int | None,
    furnished: bool | None,
) -> Unit:
    organisation_id = await get_organisation_id_for_property(db, property_id)
    await assert_can_manage_organisation(db, user, organisation_id)

    unit = Unit(
        property_id=property_id,
        category_id=category_id,
        public_label=public_label,
        bedrooms=bedrooms,
        bathrooms=bathrooms,
        furnished=furnished,
        source_status="MANAGER_SUPPLIED",
        verification_status="UNVERIFIED",
        publication_status="DRAFT",
    )
    db.add(unit)
    await db.commit()
    await db.refresh(unit)
    return unit
