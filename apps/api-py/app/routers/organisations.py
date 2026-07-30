"""Direct port of organisations/organisations.controller.ts."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AuthenticatedUser, get_current_user
from app.services.organisations_service import create_organisation, list_organisations_for_user

router = APIRouter(prefix="/organisations", tags=["organisations"])


class CreateOrganisationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    registration_number: str | None = None
    kra_pin: str | None = None


def _serialize(org):
    return {
        "id": org.id,
        "name": org.name,
        "registrationNumber": org.registration_number,
        "kraPin": org.kra_pin,
        "status": org.status,
        "createdAt": org.created_at,
    }


@router.post("", status_code=201)
async def create(
    body: CreateOrganisationRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await create_organisation(db, user, body.name, body.registration_number, body.kra_pin)
    return _serialize(org)


@router.get("/mine")
async def list_mine(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    orgs = await list_organisations_for_user(db, user)
    return [_serialize(o) for o in orgs]
