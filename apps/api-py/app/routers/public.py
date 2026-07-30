"""
Direct port of apps/api/src/public/public.controller.ts and
public.service.ts — including the two real fixes discovered this session:
(1) listCounties returns ALL counties with live counts (not just ones with
data), (2) the countySlug query param name matches the frontend exactly.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import County, Property, University

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/counties")
async def list_counties(db: AsyncSession = Depends(get_db)):
    counties = (await db.execute(select(County).order_by(County.rollout_phase))).scalars().all()

    property_counts = dict(
        (await db.execute(
            select(Property.county_id, func.count())
            .where(Property.publication_status == "PUBLISHED")
            .group_by(Property.county_id)
        )).all()
    )
    university_counts = dict(
        (await db.execute(
            select(University.county_id, func.count())
            .where(University.verification_status == "VERIFIED")
            .group_by(University.county_id)
        )).all()
    )

    return [
        {
            "id": c.id,
            "name": c.name,
            "slug": c.slug,
            "rolloutPhase": c.rollout_phase,
            "publishedPropertyCount": property_counts.get(c.id, 0),
            "verifiedUniversityCount": university_counts.get(c.id, 0),
        }
        for c in counties
    ]


@router.get("/counties/{slug}")
async def get_county(slug: str, db: AsyncSession = Depends(get_db)):
    county = (await db.execute(select(County).where(County.slug == slug))).scalar_one_or_none()
    if county is None:
        raise HTTPException(status_code=404, detail="County not found.")

    published_property_count = (
        await db.execute(
            select(func.count())
            .select_from(Property)
            .where(Property.county_id == county.id, Property.publication_status == "PUBLISHED")
        )
    ).scalar_one()
    verified_university_count = (
        await db.execute(
            select(func.count())
            .select_from(University)
            .where(University.county_id == county.id, University.verification_status == "VERIFIED")
        )
    ).scalar_one()

    return {
        "id": county.id,
        "name": county.name,
        "slug": county.slug,
        "rolloutPhase": county.rollout_phase,
        "publishedPropertyCount": published_property_count,
        "verifiedUniversityCount": verified_university_count,
    }


@router.get("/universities")
async def list_universities(
    countySlug: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(University).where(University.verification_status == "VERIFIED")
    if countySlug:
        stmt = stmt.join(County, University.county_id == County.id).where(County.slug == countySlug)
    stmt = stmt.order_by(University.official_name)

    universities = (await db.execute(stmt)).scalars().all()
    return [
        {
            "officialName": u.official_name,
            "slug": u.slug,
            "verificationStatus": u.verification_status,
        }
        for u in universities
    ]


@router.get("/universities/{slug}")
async def get_university(slug: str, db: AsyncSession = Depends(get_db)):
    university = (
        await db.execute(select(University).where(University.slug == slug))
    ).scalar_one_or_none()
    if university is None:
        raise HTTPException(status_code=404, detail="University not found.")
    return {
        "officialName": university.official_name,
        "slug": university.slug,
        "type": university.type,
        "website": university.website,
        "verificationStatus": university.verification_status,
    }


@router.get("/properties")
async def search_properties(
    countySlug: str | None = Query(default=None),
    limit: int = Query(default=12, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Property).where(Property.publication_status == "PUBLISHED")
    if countySlug:
        stmt = stmt.join(County, Property.county_id == County.id).where(County.slug == countySlug)
    stmt = stmt.limit(limit)

    properties = (await db.execute(stmt)).scalars().all()
    total = (
        await db.execute(
            select(func.count()).select_from(
                stmt.with_only_columns(Property.id).order_by(None).limit(None).subquery()
            )
        )
    ).scalar_one()

    return {
        "results": [
            {"id": p.id, "title": p.title, "slug": p.slug, "publicReference": p.public_reference}
            for p in properties
        ],
        "pagination": {"page": 1, "limit": limit, "total": total, "totalPages": 1},
    }


@router.get("/properties/{slug}")
async def get_property(slug: str, db: AsyncSession = Depends(get_db)):
    prop = (await db.execute(select(Property).where(Property.slug == slug))).scalar_one_or_none()
    if prop is None:
        raise HTTPException(status_code=404, detail="Property not found.")
    return {
        "id": prop.id,
        "title": prop.title,
        "slug": prop.slug,
        "publicReference": prop.public_reference,
        "description": prop.description,
        "address": prop.address,
    }
