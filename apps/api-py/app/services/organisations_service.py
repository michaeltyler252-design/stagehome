"""Direct port of organisations/organisations.service.ts."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AuthenticatedUser
from app.models import Organisation, OrganisationMember, Role, UserRole


async def create_organisation(
    db: AsyncSession,
    user: AuthenticatedUser,
    name: str,
    registration_number: str | None,
    kra_pin: str | None,
) -> Organisation:
    owner_role = (await db.execute(select(Role).where(Role.name == "Owner"))).scalar_one_or_none()
    if owner_role is None:
        owner_role = Role(name="Owner")
        db.add(owner_role)
        await db.flush()

    org = Organisation(name=name, registration_number=registration_number, kra_pin=kra_pin, status="PENDING_VERIFICATION")
    db.add(org)
    await db.flush()

    db.add(OrganisationMember(organisation_id=org.id, user_id=user.user_id, title="Owner"))
    db.add(UserRole(user_id=user.user_id, role_id=owner_role.id, organisation_id=org.id))

    await db.commit()
    await db.refresh(org)
    return org


async def list_organisations_for_user(db: AsyncSession, user: AuthenticatedUser) -> list[Organisation]:
    if "Admin" in user.roles:
        stmt = select(Organisation).order_by(Organisation.created_at.desc())
    else:
        stmt = (
            select(Organisation)
            .join(OrganisationMember, OrganisationMember.organisation_id == Organisation.id)
            .where(OrganisationMember.user_id == user.user_id)
            .order_by(Organisation.created_at.desc())
        )
    return list((await db.execute(stmt)).scalars().all())
