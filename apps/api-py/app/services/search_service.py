"""Direct, now-complete port of search/search.service.ts — including the
richer sort options (lowest_rent, highest_rent, highest_verified_rating,
available_soonest, most_reviewed), which a previous round left
simplified to created_at ordering. Real joins to
pricing_rules/reviews/availability_periods now back every sort option
the original supports."""

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AvailabilityPeriod, County, PricingRule, Property, PropertyCategory, Review


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

    # "nearest" and the richer sorts below need the full matching set
    # fetched before slicing to a page (same documented limitation the
    # original itself notes: correct within a page, not globally correct
    # across pages until this data is indexed/denormalised — see the
    # original search.service.ts's own comment on this).
    full_set_sorts = {"nearest", "lowest_rent", "highest_rent", "highest_verified_rating", "available_soonest"}
    needs_full_set_sort = sort in full_set_sorts

    if sort == "most_reviewed":
        # This one CAN be expressed as a direct database ORDER BY.
        review_counts = (
            select(Review.property_id, func.count().label("review_count"))
            .group_by(Review.property_id)
            .subquery()
        )
        stmt = stmt.outerjoin(review_counts, Property.id == review_counts.c.property_id)
        stmt = stmt.order_by(func.coalesce(review_counts.c.review_count, 0).desc())
        stmt = stmt.offset((page - 1) * limit).limit(limit)
    elif not needs_full_set_sort:
        stmt = stmt.order_by(Property.created_at.desc()).offset((page - 1) * limit).limit(limit)

    results = list((await db.execute(stmt)).scalars().all())

    if needs_full_set_sort:
        property_ids = [p.id for p in results]

        if sort == "nearest" and radius_distance_by_id:
            results.sort(key=lambda p: radius_distance_by_id.get(p.id, float("inf")))

        elif sort in ("lowest_rent", "highest_rent"):
            rent_by_property = dict(
                (await db.execute(
                    select(PricingRule.property_id, func.min(PricingRule.rent_amount_min))
                    .where(PricingRule.property_id.in_(property_ids))
                    .group_by(PricingRule.property_id)
                )).all()
            )
            reverse = sort == "highest_rent"
            default = float("-inf") if reverse else float("inf")
            results.sort(key=lambda p: float(rent_by_property.get(p.id, default) or default), reverse=reverse)

        elif sort == "highest_verified_rating":
            avg_rating_by_property = dict(
                (await db.execute(
                    select(Review.property_id, func.avg(Review.overall_rating))
                    .where(Review.property_id.in_(property_ids))
                    .group_by(Review.property_id)
                )).all()
            )
            results.sort(key=lambda p: float(avg_rating_by_property.get(p.id, -1) or -1), reverse=True)

        elif sort == "available_soonest":
            available_from_by_property = dict(
                (await db.execute(
                    select(AvailabilityPeriod.property_id, func.min(AvailabilityPeriod.available_from))
                    .where(AvailabilityPeriod.property_id.in_(property_ids), AvailabilityPeriod.available_from.is_not(None))
                    .group_by(AvailabilityPeriod.property_id)
                )).all()
            )
            from datetime import datetime, timezone
            far_future = datetime.max.replace(tzinfo=timezone.utc)
            results.sort(key=lambda p: available_from_by_property.get(p.id) or far_future)

        results = results[(page - 1) * limit : page * limit]

    return {
        "results": [{"id": p.id, "title": p.title, "slug": p.slug, "publicReference": p.public_reference} for p in results],
        "pagination": {"page": page, "limit": limit, "total": total, "totalPages": max((total + limit - 1) // limit, 1)},
    }
