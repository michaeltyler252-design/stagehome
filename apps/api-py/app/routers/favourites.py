"""Direct port of apps/api/src/favourites/favourites.controller.ts and
favourites.service.ts."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AuthenticatedUser, get_current_user
from app.models import Favourite, Property

router = APIRouter(tags=["favourites"])


@router.post("/properties/{property_id}/favourite", status_code=201)
async def add_favourite(
    property_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    prop = (await db.execute(select(Property).where(Property.id == property_id))).scalar_one_or_none()
    if prop is None:
        raise HTTPException(status_code=404, detail="Property not found.")

    # Idempotent: favouriting an already-favourited property just returns
    # the existing row rather than erroring (matches favourites.service.ts).
    stmt = (
        pg_insert(Favourite)
        .values(id=uuid.uuid4().hex, user_id=user.user_id, property_id=property_id)
        .on_conflict_do_nothing(index_elements=["user_id", "property_id"])
    )
    await db.execute(stmt)
    await db.commit()
    return {"propertyId": property_id, "favourited": True}


@router.delete("/properties/{property_id}/favourite")
async def remove_favourite(
    property_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(Favourite).where(Favourite.user_id == user.user_id, Favourite.property_id == property_id)
    )
    await db.commit()
    return {"removed": True}


@router.get("/favourites/mine")
async def list_my_favourites(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    favourites = (
        await db.execute(
            select(Favourite)
            .where(Favourite.user_id == user.user_id)
            .order_by(Favourite.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
    ).scalars().all()
    return [{"id": f.id, "propertyId": f.property_id, "createdAt": f.created_at} for f in favourites]
