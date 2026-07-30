"""Direct port of dashboards/dashboards.controller.ts."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AuthenticatedUser, get_current_user, require_roles
from app.services import dashboards_service

router = APIRouter(prefix="/dashboard", tags=["dashboards"])


@router.get("/tenant")
async def tenant(user: AuthenticatedUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await dashboards_service.tenant_dashboard(db, user.user_id)


@router.get("/manager/{organisation_id}", dependencies=[Depends(require_roles("Owner", "Manager", "Accountant", "Admin"))])
async def manager(
    organisation_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await dashboards_service.manager_dashboard(db, user, organisation_id)


@router.get("/admin", dependencies=[Depends(require_roles("Admin"))])
async def admin(db: AsyncSession = Depends(get_db)):
    return await dashboards_service.admin_dashboard(db)
