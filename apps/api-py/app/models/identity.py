"""Identity and organisations models — direct port of schema.prisma's
"IDENTITY AND ORGANISATIONS" section."""

from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UserAccountStatus, VerificationStatus, cuid


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    email: Mapped[str | None] = mapped_column(String, unique=True, default=None)
    phone: Mapped[str | None] = mapped_column(String, unique=True, default=None)
    password_hash: Mapped[str | None] = mapped_column(String, default=None)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[UserAccountStatus] = mapped_column(default=UserAccountStatus.PENDING_VERIFICATION)
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]

    profile: Mapped["UserProfile | None"] = relationship(back_populates="user", uselist=False)
    sessions: Mapped[list["UserSession"]] = relationship(back_populates="user")
    roles: Mapped[list["UserRole"]] = relationship(back_populates="user")


class UserProfile(Base):
    __tablename__ = "user_profiles"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("public.users.id"), unique=True)
    first_name: Mapped[str | None] = mapped_column(String, default=None)
    last_name: Mapped[str | None] = mapped_column(String, default=None)
    avatar_url: Mapped[str | None] = mapped_column(String, default=None)
    student_id_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    institution_name: Mapped[str | None] = mapped_column(String, default=None)
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]

    user: Mapped["User"] = relationship(back_populates="profile")


class UserSession(Base):
    __tablename__ = "user_sessions"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("public.users.id"))
    # SHA-256 hash only, never the plaintext refresh token — same principle
    # as password hashing (see auth.service.ts's hashToken()).
    refresh_token: Mapped[str] = mapped_column(String, unique=True)
    ip_address: Mapped[str | None] = mapped_column(String, default=None)
    user_agent: Mapped[str | None] = mapped_column(String, default=None)
    expires_at: Mapped[datetime]
    revoked_at: Mapped[datetime | None] = mapped_column(default=None)
    created_at: Mapped[datetime]

    user: Mapped["User"] = relationship(back_populates="sessions")


class UserDevice(Base):
    __tablename__ = "user_devices"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("public.users.id"))
    device_name: Mapped[str | None] = mapped_column(String, default=None)
    push_token: Mapped[str | None] = mapped_column(String, default=None)
    last_seen_at: Mapped[datetime | None] = mapped_column(default=None)
    created_at: Mapped[datetime]


class Role(Base):
    __tablename__ = "roles"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    name: Mapped[str] = mapped_column(String, unique=True)
    description: Mapped[str | None] = mapped_column(String, default=None)

    permissions: Mapped[list["RolePermission"]] = relationship(back_populates="role")
    user_roles: Mapped[list["UserRole"]] = relationship(back_populates="role")


class Permission(Base):
    __tablename__ = "permissions"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    key: Mapped[str] = mapped_column(String, unique=True)

    roles: Mapped[list["RolePermission"]] = relationship(back_populates="permission")


class RolePermission(Base):
    __tablename__ = "role_permissions"
    __table_args__ = {"schema": "public"}

    role_id: Mapped[str] = mapped_column(ForeignKey("public.roles.id"), primary_key=True)
    permission_id: Mapped[str] = mapped_column(ForeignKey("public.permissions.id"), primary_key=True)

    role: Mapped["Role"] = relationship(back_populates="permissions")
    permission: Mapped["Permission"] = relationship(back_populates="roles")


class UserRole(Base):
    __tablename__ = "user_roles"
    __table_args__ = (
        UniqueConstraint("user_id", "role_id", "organisation_id"),
        {"schema": "public"},
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("public.users.id"))
    role_id: Mapped[str] = mapped_column(ForeignKey("public.roles.id"))
    organisation_id: Mapped[str | None] = mapped_column(
        ForeignKey("public.organisations.id"), default=None
    )
    created_at: Mapped[datetime]

    user: Mapped["User"] = relationship(back_populates="roles")
    role: Mapped["Role"] = relationship(back_populates="user_roles")


class Organisation(Base, TimestampMixin):
    __tablename__ = "organisations"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    name: Mapped[str] = mapped_column(String)
    registration_number: Mapped[str | None] = mapped_column(String, default=None)
    kra_pin: Mapped[str | None] = mapped_column(String, default=None)
    status: Mapped[str] = mapped_column(String, default="PENDING_VERIFICATION")

    members: Mapped[list["OrganisationMember"]] = relationship(back_populates="organisation")


class OrganisationMember(Base):
    __tablename__ = "organisation_members"
    __table_args__ = (
        UniqueConstraint("organisation_id", "user_id"),
        {"schema": "public"},
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    organisation_id: Mapped[str] = mapped_column(ForeignKey("public.organisations.id"))
    user_id: Mapped[str] = mapped_column(ForeignKey("public.users.id"))
    title: Mapped[str | None] = mapped_column(String, default=None)
    created_at: Mapped[datetime]

    organisation: Mapped["Organisation"] = relationship(back_populates="members")


class ManagerProfile(Base, TimestampMixin):
    __tablename__ = "manager_profiles"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("public.users.id"), unique=True)
    display_name: Mapped[str | None] = mapped_column(String, default=None)
    support_phone: Mapped[str | None] = mapped_column(String, default=None)
    support_whatsapp: Mapped[str | None] = mapped_column(String, default=None)


class IdentityDocument(Base):
    __tablename__ = "identity_documents"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("public.users.id"))
    document_type: Mapped[str] = mapped_column(String)
    storage_key: Mapped[str] = mapped_column(String)
    verification_case_id: Mapped[str | None] = mapped_column(
        ForeignKey("public.verification_cases.id"), default=None
    )
    created_at: Mapped[datetime]


class VerificationCase(Base, TimestampMixin):
    __tablename__ = "verification_cases"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    subject_type: Mapped[str] = mapped_column(String, index=True)
    subject_id: Mapped[str] = mapped_column(String, index=True)
    status: Mapped[VerificationStatus] = mapped_column(default=VerificationStatus.PENDING)
    assigned_to: Mapped[str | None] = mapped_column(String, default=None)
    resolved_at: Mapped[datetime | None] = mapped_column(default=None)
    notes: Mapped[str | None] = mapped_column(String, default=None)


class PayoutAccount(Base):
    __tablename__ = "payout_accounts"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    organisation_id: Mapped[str | None] = mapped_column(
        ForeignKey("public.organisations.id"), default=None
    )
    user_id: Mapped[str | None] = mapped_column(ForeignKey("public.users.id"), default=None)
    method: Mapped[str] = mapped_column(String)
    masked_details: Mapped[str] = mapped_column(String)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime]
