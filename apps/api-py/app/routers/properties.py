"""Direct port of properties/properties.controller.ts."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AuthenticatedUser, get_current_user, require_roles
from app.services import properties_service

router = APIRouter(tags=["properties"], dependencies=[Depends(require_roles("Owner", "Manager", "Admin"))])


class CreatePropertyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str
    county_id: str
    town_id: str | None = None
    estate_id: str | None = None
    category_id: str | None = None
    description: str | None = None
    address: str | None = None
    private_lat: float | None = None
    private_lng: float | None = None


class UpdatePropertyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str | None = None
    county_id: str | None = None
    town_id: str | None = None
    estate_id: str | None = None
    category_id: str | None = None
    description: str | None = None
    address: str | None = None
    private_lat: float | None = None
    private_lng: float | None = None


class CreateUnitRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category_id: str | None = None
    public_label: str | None = None
    bedrooms: int | None = None
    bathrooms: int | None = None
    furnished: bool | None = None


def _serialize_property(p):
    return {
        "id": p.id,
        "organisationId": p.organisation_id,
        "title": p.title,
        "slug": p.slug,
        "publicReference": p.public_reference,
        "countyId": p.county_id,
        "townId": p.town_id,
        "estateId": p.estate_id,
        "categoryId": p.category_id,
        "description": p.description,
        "address": p.address,
        "privateLat": p.private_lat,
        "privateLng": p.private_lng,
        "verificationStatus": p.verification_status,
        "publicationStatus": p.publication_status,
        "createdAt": p.created_at,
    }


@router.post("/organisations/{organisation_id}/properties", status_code=201)
async def create(
    organisation_id: str,
    body: CreatePropertyRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    prop = await properties_service.create_property(
        db, user, organisation_id, body.title, body.county_id, body.town_id,
        body.estate_id, body.category_id, body.description, body.address,
        body.private_lat, body.private_lng,
    )
    return _serialize_property(prop)


@router.get("/organisations/{organisation_id}/properties")
async def list_for_organisation(
    organisation_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    props = await properties_service.list_properties_for_organisation(db, user, organisation_id)
    return [_serialize_property(p) for p in props]


@router.get("/properties/{property_id}")
async def get_one(
    property_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    prop = await properties_service.get_property(db, user, property_id)
    return _serialize_property(prop)


@router.patch("/properties/{property_id}")
async def update(
    property_id: str,
    body: UpdatePropertyRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updates = {k: v for k, v in body.model_dump().items()}
    prop = await properties_service.update_property(db, user, property_id, updates)
    return _serialize_property(prop)


@router.post("/properties/{property_id}/submit-for-verification")
async def submit_for_verification(
    property_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    prop = await properties_service.submit_for_verification(db, user, property_id)
    return _serialize_property(prop)


@router.post("/properties/{property_id}/units", status_code=201)
async def add_unit(
    property_id: str,
    body: CreateUnitRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    unit = await properties_service.add_unit(
        db, user, property_id, body.category_id, body.public_label, body.bedrooms, body.bathrooms, body.furnished
    )
    return {
        "id": unit.id,
        "propertyId": unit.property_id,
        "categoryId": unit.category_id,
        "publicLabel": unit.public_label,
        "bedrooms": unit.bedrooms,
        "bathrooms": unit.bathrooms,
        "furnished": unit.furnished,
        "verificationStatus": unit.verification_status,
        "publicationStatus": unit.publication_status,
    }
