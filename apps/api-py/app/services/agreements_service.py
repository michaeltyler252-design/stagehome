"""Direct port of agreements/agreements.service.ts."""

import hashlib
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AuthenticatedUser
from app.models import (
    Agreement,
    AgreementSignatory,
    AgreementVersion,
    Booking,
    HouseRule,
    Organisation,
    Property,
    SignatureEvent,
    SignatureRequest,
    SignedDocument,
    Unit,
    User,
    UserProfile,
)
from app.services import notifications_service
from app.services.agreement_template import render_default_agreement

SIGNING_LINK_TTL_DAYS = 14


async def generate(db: AsyncSession, user: AuthenticatedUser, booking_id: str) -> dict:
    """Generates a tenancy agreement for a confirmed booking and issues one
    authenticated signing link per signatory (tenant + the property's
    organisation). Refuses to regenerate over an already-signed
    agreement — enforced here, not just documented."""
    booking = (await db.execute(select(Booking).where(Booking.id == booking_id))).scalar_one_or_none()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if booking.user_id != user.user_id and "Admin" not in user.roles:
        raise HTTPException(status_code=403, detail="This booking belongs to a different account.")
    if booking.status != "CONFIRMED":
        raise HTTPException(
            status_code=400,
            detail=f'Cannot generate an agreement for a booking in status "{booking.status}"; it must be CONFIRMED (payment complete) first.',
        )

    existing_agreements = (
        await db.execute(select(Agreement).where(Agreement.booking_id == booking_id))
    ).scalars().all()
    if any(a.status == "FULLY_SIGNED" for a in existing_agreements):
        raise HTTPException(
            status_code=400,
            detail="This booking already has a fully signed agreement. Sealed agreements are never silently replaced — issue a formal amendment instead.",
        )

    unit = (await db.execute(select(Unit).where(Unit.id == booking.unit_id))).scalar_one()
    prop = (await db.execute(select(Property).where(Property.id == unit.property_id))).scalar_one()
    organisation = (await db.execute(select(Organisation).where(Organisation.id == prop.organisation_id))).scalar_one()
    house_rules = (await db.execute(select(HouseRule).where(HouseRule.property_id == prop.id))).scalars().all()
    booking_user = (await db.execute(select(User).where(User.id == booking.user_id))).scalar_one()
    profile = (
        await db.execute(select(UserProfile).where(UserProfile.user_id == booking.user_id))
    ).scalar_one_or_none()

    tenant_name = (
        " ".join(filter(None, [profile.first_name if profile else None, profile.last_name if profile else None])).strip()
        or booking_user.email
        or booking_user.phone
        or "Tenant"
    )

    body_markdown = render_default_agreement(
        {
            "tenant_name": tenant_name,
            "manager_organisation_name": organisation.name,
            "property_title": prop.title,
            "property_address": prop.address or "Information Required",
            "unit_label": unit.public_label or "Information Required",
            "agreed_rent": f"KES {float(booking.agreed_rent):,.0f}",
            "agreed_deposit": f"KES {float(booking.agreed_deposit):,.0f}" if booking.agreed_deposit else "Information Required",
            "move_in_date": booking.move_in_date.strftime("%a %b %d %Y") if booking.move_in_date else "Information Required",
            "house_rules": [{"rule_type": r.rule_type, "detail": r.detail} for r in house_rules],
        }
    )

    document_hash = hashlib.sha256(body_markdown.encode()).hexdigest()

    agreement = Agreement(booking_id=booking.id, status="SENT")
    db.add(agreement)
    await db.flush()

    db.add(
        AgreementVersion(
            agreement_id=agreement.id,
            version=1,
            document_hash=document_hash,
            # Real object storage is a follow-up, matching the original's
            # own documented scope for this exact field.
            body_storage_key=f"agreements/{booking.id}/v1.md",
        )
    )

    tenant_signatory = AgreementSignatory(agreement_id=agreement.id, user_id=booking.user_id, role="tenant")
    manager_signatory = AgreementSignatory(agreement_id=agreement.id, role="manager")
    db.add(tenant_signatory)
    db.add(manager_signatory)
    await db.flush()

    tenant_request = SignatureRequest(
        signatory_id=tenant_signatory.id,
        authenticated_link_token=uuid.uuid4().hex,
        expires_at=datetime.now(timezone.utc) + timedelta(days=SIGNING_LINK_TTL_DAYS),
    )
    manager_request = SignatureRequest(
        signatory_id=manager_signatory.id,
        authenticated_link_token=uuid.uuid4().hex,
        expires_at=datetime.now(timezone.utc) + timedelta(days=SIGNING_LINK_TTL_DAYS),
    )
    db.add(tenant_request)
    db.add(manager_request)
    await db.commit()
    await db.refresh(agreement)

    # Only the tenant signatory has a real user_id today — the manager
    # signatory is created role-only (resolving "which specific manager
    # user should sign" is a follow-up, not yet implemented), so only the
    # tenant gets notified here.
    await notifications_service.notify(
        db,
        booking.user_id,
        "agreement_signing_link",
        "Your tenancy agreement is ready to sign",
        f"Please review and sign your tenancy agreement for {prop.title}: /agreements/sign/{tenant_request.authenticated_link_token}",
        {"agreementId": agreement.id},
    )

    return {
        "agreement": {"id": agreement.id, "bookingId": agreement.booking_id, "status": agreement.status},
        "bodyMarkdown": body_markdown,
        "signingLinks": [
            {"role": "tenant", "token": tenant_request.authenticated_link_token},
            {"role": "manager", "token": manager_request.authenticated_link_token},
        ],
    }


async def get_by_token(db: AsyncSession, token: str, ip_address: str | None) -> dict:
    """Fetches an agreement by its per-signatory link token. Never trusts
    a booking or agreement id directly from an unauthenticated caller —
    the token IS the authentication."""
    request = (
        await db.execute(select(SignatureRequest).where(SignatureRequest.authenticated_link_token == token))
    ).scalar_one_or_none()
    if request is None:
        raise HTTPException(status_code=404, detail="Signing link not found or already used.")

    now = datetime.now(request.expires_at.tzinfo) if request.expires_at.tzinfo else datetime.now()
    if request.expires_at < now:
        raise HTTPException(status_code=400, detail="This signing link has expired.")

    signatory = (
        await db.execute(select(AgreementSignatory).where(AgreementSignatory.id == request.signatory_id))
    ).scalar_one()
    agreement = (await db.execute(select(Agreement).where(Agreement.id == signatory.agreement_id))).scalar_one()
    latest_version = (
        await db.execute(
            select(AgreementVersion)
            .where(AgreementVersion.agreement_id == agreement.id)
            .order_by(AgreementVersion.version.desc())
        )
    ).scalars().first()

    db.add(SignatureEvent(signature_request_id=request.id, event_type="viewed", ip_address=ip_address))
    await db.commit()

    return {
        "role": signatory.role,
        "alreadySigned": bool(signatory.signed_at),
        "agreementStatus": agreement.status,
        "latestVersion": {"version": latest_version.version, "documentHash": latest_version.document_hash} if latest_version else None,
    }


async def sign(db: AsyncSession, token: str, ip_address: str | None) -> dict:
    """Records consent and seals the signature. Once every signatory has
    signed, the agreement moves to FULLY_SIGNED and a SignedDocument is
    sealed — after which generate() above refuses to ever touch this
    agreement again."""
    request = (
        await db.execute(select(SignatureRequest).where(SignatureRequest.authenticated_link_token == token))
    ).scalar_one_or_none()
    if request is None:
        raise HTTPException(status_code=404, detail="Signing link not found.")

    now = datetime.now(request.expires_at.tzinfo) if request.expires_at.tzinfo else datetime.now()
    if request.expires_at < now:
        raise HTTPException(status_code=400, detail="This signing link has expired.")

    signatory = (
        await db.execute(select(AgreementSignatory).where(AgreementSignatory.id == request.signatory_id))
    ).scalar_one()
    if signatory.signed_at:
        raise HTTPException(status_code=400, detail="This signatory has already signed.")

    db.add(SignatureEvent(signature_request_id=request.id, event_type="consented", ip_address=ip_address))
    db.add(SignatureEvent(signature_request_id=request.id, event_type="signed", ip_address=ip_address))
    signatory.signed_at = datetime.now(timezone.utc)
    await db.commit()

    all_signatories = (
        await db.execute(select(AgreementSignatory).where(AgreementSignatory.agreement_id == signatory.agreement_id))
    ).scalars().all()
    still_pending = [s for s in all_signatories if s.id != signatory.id and not s.signed_at]

    agreement = (await db.execute(select(Agreement).where(Agreement.id == signatory.agreement_id))).scalar_one()

    if len(still_pending) == 0:
        agreement.status = "FULLY_SIGNED"
        db.add(SignedDocument(agreement_id=signatory.agreement_id, storage_key=f"agreements/{signatory.agreement_id}/sealed.pdf"))
        await db.commit()
        return {"fullySigned": True}

    agreement.status = "PARTIALLY_SIGNED"
    await db.commit()
    return {"fullySigned": False}
