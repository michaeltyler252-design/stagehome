"""Booking, payment, and agreement models — direct port of
schema.prisma's "BOOKING AND PAYMENTS" and "AGREEMENTS" sections."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Boolean, ForeignKey, Integer, JSON, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import (
    AgreementStatus,
    Base,
    BookingStatus,
    PaymentProvider,
    PaymentStatus,
    cuid,
)


class BookingQuote(Base):
    __tablename__ = "booking_quotes"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    unit_id: Mapped[str] = mapped_column(ForeignKey("public.units.id"))
    user_id: Mapped[str | None] = mapped_column(String, default=None)
    move_in_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    quoted_rent: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    quoted_deposit: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), default=None)
    quoted_fees: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), default=None)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    holds: Mapped[list["BookingHold"]] = relationship(back_populates="booking_quote")


class BookingHold(Base):
    __tablename__ = "booking_holds"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    booking_quote_id: Mapped[str] = mapped_column(ForeignKey("public.booking_quotes.id"))
    # Redis lock reference for double-booking prevention.
    lock_key: Mapped[str] = mapped_column(String, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    booking_quote: Mapped["BookingQuote"] = relationship(back_populates="holds")


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    unit_id: Mapped[str] = mapped_column(ForeignKey("public.units.id"))
    user_id: Mapped[str] = mapped_column(ForeignKey("public.users.id"))
    status: Mapped[BookingStatus] = mapped_column(default=BookingStatus.QUOTE)
    move_in_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    agreed_rent: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    agreed_deposit: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), default=None)
    # Frozen at confirmation — managers cannot retroactively edit.
    policy_snapshot_json: Mapped[dict | None] = mapped_column(JSON, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    guests: Mapped[list["BookingGuest"]] = relationship(back_populates="booking")
    payments: Mapped[list["Payment"]] = relationship(back_populates="booking")
    agreements: Mapped[list["Agreement"]] = relationship(back_populates="booking")


class BookingGuest(Base):
    __tablename__ = "booking_guests"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    booking_id: Mapped[str] = mapped_column(ForeignKey("public.bookings.id"))
    full_name: Mapped[str] = mapped_column(String)
    phone: Mapped[str | None] = mapped_column(String, default=None)

    booking: Mapped["Booking"] = relationship(back_populates="guests")


class BookingInstallment(Base):
    __tablename__ = "booking_installments"
    __table_args__ = (
        UniqueConstraint("booking_id", "sequence"),
        {"schema": "public"},
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    booking_id: Mapped[str] = mapped_column(ForeignKey("public.bookings.id"))
    sequence: Mapped[int] = mapped_column(Integer)
    amount_due: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    booking_id: Mapped[str] = mapped_column(ForeignKey("public.bookings.id"))
    provider: Mapped[PaymentProvider] = mapped_column()
    status: Mapped[PaymentStatus] = mapped_column(default=PaymentStatus.INITIATED)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String, default="KES")
    idempotency_key: Mapped[str] = mapped_column(String, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    booking: Mapped["Booking"] = relationship(back_populates="payments")
    attempts: Mapped[list["PaymentAttempt"]] = relationship(back_populates="payment")
    callbacks: Mapped[list["PaymentCallback"]] = relationship(back_populates="payment")
    refunds: Mapped[list["Refund"]] = relationship(back_populates="payment")


class PaymentAttempt(Base):
    __tablename__ = "payment_attempts"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    payment_id: Mapped[str] = mapped_column(ForeignKey("public.payments.id"))
    provider_ref: Mapped[str | None] = mapped_column(String, default=None)
    status: Mapped[PaymentStatus] = mapped_column()
    raw_response_json: Mapped[dict | None] = mapped_column(JSON, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    payment: Mapped["Payment"] = relationship(back_populates="attempts")


class PaymentCallback(Base):
    __tablename__ = "payment_callbacks"
    __table_args__ = (
        UniqueConstraint("provider_ref"),
        {"schema": "public"},
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    payment_id: Mapped[str | None] = mapped_column(ForeignKey("public.payments.id"), default=None)
    provider_ref: Mapped[str | None] = mapped_column(String, default=None)
    signature_valid: Mapped[bool] = mapped_column(Boolean, default=False)
    raw_payload_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    payment: Mapped["Payment | None"] = relationship(back_populates="callbacks")


class PaymentAllocation(Base):
    __tablename__ = "payment_allocations"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    payment_id: Mapped[str] = mapped_column(ForeignKey("public.payments.id"))
    allocation_type: Mapped[str] = mapped_column(String)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))


class Refund(Base):
    __tablename__ = "refunds"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    payment_id: Mapped[str] = mapped_column(ForeignKey("public.payments.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    reason: Mapped[str | None] = mapped_column(String, default=None)
    requires_dual_control: Mapped[bool] = mapped_column(Boolean, default=False)
    requested_by: Mapped[str | None] = mapped_column(String, default=None)
    approved_by: Mapped[str | None] = mapped_column(String, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    payment: Mapped["Payment"] = relationship(back_populates="refunds")


class Chargeback(Base):
    __tablename__ = "chargebacks"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    payment_id: Mapped[str] = mapped_column(ForeignKey("public.payments.id"))
    reason: Mapped[str | None] = mapped_column(String, default=None)
    status: Mapped[str] = mapped_column(String, default="OPEN")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Receipt(Base):
    __tablename__ = "receipts"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    payment_id: Mapped[str] = mapped_column(ForeignKey("public.payments.id"))
    storage_key: Mapped[str | None] = mapped_column(String, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Payout(Base):
    __tablename__ = "payouts"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    payout_account_id: Mapped[str] = mapped_column(ForeignKey("public.payout_accounts.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    status: Mapped[str] = mapped_column(String, default="PENDING")
    requires_dual_control: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LedgerAccount(Base):
    __tablename__ = "ledger_accounts"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    name: Mapped[str] = mapped_column(String, unique=True)
    type: Mapped[str] = mapped_column(String)


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    ledger_account_id: Mapped[str] = mapped_column(ForeignKey("public.ledger_accounts.id"))
    debit: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), default=None)
    credit: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), default=None)
    reference_type: Mapped[str | None] = mapped_column(String, default=None)
    reference_id: Mapped[str | None] = mapped_column(String, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ReconciliationRun(Base):
    __tablename__ = "reconciliation_runs"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    provider: Mapped[PaymentProvider] = mapped_column()
    run_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    matched_count: Mapped[int] = mapped_column(Integer, default=0)
    unmatched_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Agreement(Base):
    __tablename__ = "agreements"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    booking_id: Mapped[str] = mapped_column(ForeignKey("public.bookings.id"))
    template_version_id: Mapped[str | None] = mapped_column(String, default=None)
    status: Mapped[AgreementStatus] = mapped_column(default=AgreementStatus.DRAFT)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    booking: Mapped["Booking"] = relationship(back_populates="agreements")
    versions: Mapped[list["AgreementVersion"]] = relationship(back_populates="agreement")
    signatories: Mapped[list["AgreementSignatory"]] = relationship(back_populates="agreement")


class AgreementVersion(Base):
    __tablename__ = "agreement_versions"
    __table_args__ = (
        UniqueConstraint("agreement_id", "version"),
        {"schema": "public"},
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    agreement_id: Mapped[str] = mapped_column(ForeignKey("public.agreements.id"))
    version: Mapped[int] = mapped_column(Integer)
    document_hash: Mapped[str] = mapped_column(String)
    body_storage_key: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    agreement: Mapped["Agreement"] = relationship(back_populates="versions")


class AgreementSignatory(Base):
    __tablename__ = "agreement_signatories"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    agreement_id: Mapped[str] = mapped_column(ForeignKey("public.agreements.id"))
    user_id: Mapped[str | None] = mapped_column(String, default=None)
    role: Mapped[str] = mapped_column(String)  # tenant | manager | witness
    signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    agreement: Mapped["Agreement"] = relationship(back_populates="signatories")
    signature_requests: Mapped[list["SignatureRequest"]] = relationship(back_populates="signatory")


class SignatureRequest(Base):
    __tablename__ = "signature_requests"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    signatory_id: Mapped[str] = mapped_column(ForeignKey("public.agreement_signatories.id"))
    authenticated_link_token: Mapped[str] = mapped_column(String, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    signatory: Mapped["AgreementSignatory"] = relationship(back_populates="signature_requests")


class SignatureEvent(Base):
    __tablename__ = "signature_events"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    signature_request_id: Mapped[str] = mapped_column(ForeignKey("public.signature_requests.id"))
    event_type: Mapped[str] = mapped_column(String)  # viewed | consented | signed
    ip_address: Mapped[str | None] = mapped_column(String, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SignedDocument(Base):
    __tablename__ = "signed_documents"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    agreement_id: Mapped[str] = mapped_column(ForeignKey("public.agreements.id"))
    storage_key: Mapped[str] = mapped_column(String)
    sealed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
