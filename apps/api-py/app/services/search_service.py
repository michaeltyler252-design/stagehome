"""Direct port of search/search.service.ts.

Honest note: the original's database-level and in-memory sort options
(lowest_rent, highest_rent, highest_verified_rating, available_soonest,
most_reviewed) rely on joined pricing_rules/reviews/availability_periods
data. The PostGIS radius search and core filters below are fully ported
and real; the richer sort options are simplified to created_at ordering
for now — see MIGRATION.md "Remaining work" for this exact, named gap
rather than silently approximating it."""

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import County, Property, PropertyCategory


async def find_within_radius(db: AsyncSession, lat: float, lng: float, radius_km: float) -> dict[str, float]:
    """Uses PostGIS to find property ids within radius_km of the given
    point, computed against the privacy-safe public_lat/public_lng
    columns — never the exact private coordinates."""
    result = await db.execute(
        text(
            """
            SELECT id, ST_Distance(
                ST_MakePoint(public_lng, public_lat)::geography,
                ST_MakePoint(:lng, :lat)::geography
            ) / 1000 AS distance_km
            FROM public.properties
            WHERE publication_status = 'PUBLISHED'
              AND public_lat IS NOT NULL
              AND public_lng IS NOT NULL
              AND ST_DWithin(
                ST_MakePoint(public_lng, public_lat)::geography,
                ST_MakePoint(:lng, :lat)::geography,
                :radius_m
              )
            ORDER BY distance_km ASC
            """
        ),
        {"lat": lat, "lng": lng, "radius_m": radius_km * 1000},
    )
    return {row.id: row.distance_km for row in result}


async def search(
    db: AsyncSession,
    county_slug: str | None = None,
    category_key: str | None = None,
    keyword: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    radius_km: float | None = None,
    sort: str | None = None,
    page: int = 1,
    limit: int = 20,
) -> dict:
    stmt = select(Property).where(Property.publication_status == "PUBLISHED")

    if county_slug:
        stmt = stmt.join(County, Property.county_id == County.id).where(County.slug == county_slug)
    if category_key:
        stmt = stmt.join(PropertyCategory, Property.category_id == PropertyCategory.id).where(PropertyCategory.key == category_key)
    if keyword:
        stmt = stmt.where(Property.title.ilike(f"%{keyword}%"))

    radius_distance_by_id: dict[str, float] | None = None
    if lat is not None and lng is not None and radius_km is not None:
        radius_distance_by_id = await find_within_radius(db, lat, lng, radius_km)
        stmt = stmt.where(Property.id.in_(list(radius_distance_by_id.keys())))

    count_stmt = select(func.count()).select_from(stmt.with_only_columns(Property.id).subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    needs_full_set_sort = sort == "nearest"

    if not needs_full_set_sort:
        stmt = stmt.order_by(Property.created_at.desc()).offset((page - 1) * limit).limit(limit)

    results = list((await db.execute(stmt)).scalars().all())

    if sort == "nearest" and radius_distance_by_id:
        results.sort(key=lambda p: radius_distance_by_id.get(p.id, float("inf")))
        results = results[(page - 1) * limit : page * limit]

    return {
        "results": [{"id": p.id, "title": p.title, "slug": p.slug, "publicReference": p.public_reference} for p in results],
        "pagination": {"page": page, "limit": limit, "total": total, "totalPages": max((total + limit - 1) // limit, 1)},
    }
