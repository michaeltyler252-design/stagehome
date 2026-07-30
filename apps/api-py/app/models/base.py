"""
Base declarative class, shared enums, and the verification-fields mixin.

The original Prisma schema's own comment says: "Reusable data-quality
mixin fields (repeated per-model — Prisma has no mixins)" — and then
repeats the same 11 fields on ~20 models by hand. Python/SQLAlchemy
genuinely supports mixins, so this is one of the few places the Python
port is structurally cleaner than the original, not just equivalent.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def cuid() -> str:
    """Prisma's @default(cuid()) produces a collision-resistant ID. Since
    existing rows already use real cuids (e.g. "cms6od50q0000t9xhusutfjxw"),
    new Python-inserted rows use a uuid4 hex string instead — different
    ID *format* going forward, but the same *role* (opaque unique string
    primary key) and fully compatible as a String primary key column.
    Existing rows and their foreign keys are completely unaffected."""
    return uuid.uuid4().hex


class Base(DeclarativeBase):
    pass


class SourceStatus(str, enum.Enum):
    SOURCE_SUPPLIED = "SOURCE_SUPPLIED"
    OFFICIAL_SOURCE = "OFFICIAL_SOURCE"
    MANAGER_SUPPLIED = "MANAGER_SUPPLIED"
    FIELD_VERIFIED = "FIELD_VERIFIED"
    MARKETPLACE_DERIVED = "MARKETPLACE_DERIVED"


class VerificationStatus(str, enum.Enum):
    UNVERIFIED = "UNVERIFIED"
    PENDING = "PENDING"
    PARTIALLY_VERIFIED = "PARTIALLY_VERIFIED"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class ConfidenceLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class ConflictStatus(str, enum.Enum):
    NONE = "NONE"
    FLAGGED = "FLAGGED"
    UNDER_REVIEW = "UNDER_REVIEW"
    RESOLVED = "RESOLVED"


class PublicationStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    REVIEW = "REVIEW"
    APPROVED = "APPROVED"
    PUBLISHED = "PUBLISHED"
    SUSPENDED = "SUSPENDED"
    ARCHIVED = "ARCHIVED"


class UserAccountStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    DELETED = "DELETED"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"


class BookingStatus(str, enum.Enum):
    QUOTE = "QUOTE"
    HELD = "HELD"
    PENDING_PAYMENT = "PENDING_PAYMENT"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"
    DISPUTED = "DISPUTED"


class PaymentStatus(str, enum.Enum):
    INITIATED = "INITIATED"
    PENDING = "PENDING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"
    CHARGEBACK = "CHARGEBACK"


class PaymentProvider(str, enum.Enum):
    MPESA_STK = "MPESA_STK"
    MPESA_PAYBILL = "MPESA_PAYBILL"
    MPESA_TILL = "MPESA_TILL"
    CARD = "CARD"
    AIRTEL_MONEY = "AIRTEL_MONEY"
    BANK_TRANSFER = "BANK_TRANSFER"


class AgreementStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    PARTIALLY_SIGNED = "PARTIALLY_SIGNED"
    FULLY_SIGNED = "FULLY_SIGNED"
    VOID = "VOID"


class VerificationMixin:
    """The 11 data-quality fields Prisma repeats by hand on every
    source-importable model (geography, education, property inventory)."""

    source_status: Mapped[SourceStatus] = mapped_column(default=SourceStatus.SOURCE_SUPPLIED)
    verification_status: Mapped[VerificationStatus] = mapped_column(
        default=VerificationStatus.UNVERIFIED
    )
    source_file: Mapped[str | None] = mapped_column(String, default=None)
    source_record_reference: Mapped[str | None] = mapped_column(String, default=None)
    source_url: Mapped[str | None] = mapped_column(String, default=None)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    verified_by: Mapped[str | None] = mapped_column(String, default=None)
    confidence_level: Mapped[ConfidenceLevel] = mapped_column(default=ConfidenceLevel.LOW)
    conflict_status: Mapped[ConflictStatus] = mapped_column(default=ConflictStatus.NONE)
    publication_status: Mapped[PublicationStatus] = mapped_column(default=PublicationStatus.DRAFT)
    notes: Mapped[str | None] = mapped_column(String, default=None)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
