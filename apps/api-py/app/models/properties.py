"""Property inventory and commercial terms models — direct port of
schema.prisma's "PROPERTY INVENTORY" and "COMMERCIAL TERMS" sections."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Boolean, Float, ForeignKey, Integer, JSON, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, VerificationMixin, cuid


class Property(Base, VerificationMixin, TimestampMixin):
    __tablename__ = "properties"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    organisation_id: Mapped[str] = mapped_column(ForeignKey("public.organisations.id"))
    county_id: Mapped[str] = mapped_column(ForeignKey("public.counties.id"), index=True)
    town_id: Mapped[str | None] = mapped_column(ForeignKey("public.towns.id"), default=None)
    estate_id: Mapped[str | None] = mapped_column(
        ForeignKey("public.estates.id"), index=True, default=None
    )
    category_id: Mapped[str | None] = mapped_column(
        ForeignKey("public.property_categories.id"), default=None
    )
    title: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String, unique=True)
    public_reference: Mapped[str] = mapped_column(String, unique=True)
    description: Mapped[str | None] = mapped_column(String, default=None)
    address: Mapped[str | None] = mapped_column(String, default=None)
    public_lat: Mapped[float | None] = mapped_column(Float, default=None)
    public_lng: Mapped[float | None] = mapped_column(Float, default=None)
    private_lat: Mapped[float | None] = mapped_column(Float, default=None)
    private_lng: Mapped[float | None] = mapped_column(Float, default=None)

    units: Mapped[list["Unit"]] = relationship(back_populates="property")
    media: Mapped[list["Media"]] = relationship(back_populates="property")
    pricing_rules: Mapped[list["PricingRule"]] = relationship(back_populates="property")


class Building(Base, TimestampMixin):
    __tablename__ = "buildings"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    property_id: Mapped[str] = mapped_column(ForeignKey("public.properties.id"))
    name: Mapped[str | None] = mapped_column(String, default=None)
    floors: Mapped[int | None] = mapped_column(Integer, default=None)


class Unit(Base, VerificationMixin, TimestampMixin):
    __tablename__ = "units"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    property_id: Mapped[str] = mapped_column(ForeignKey("public.properties.id"))
    building_id: Mapped[str | None] = mapped_column(ForeignKey("public.buildings.id"), default=None)
    category_id: Mapped[str | None] = mapped_column(
        ForeignKey("public.unit_categories.id"), default=None
    )
    public_label: Mapped[str | None] = mapped_column(String, default=None)
    bedrooms: Mapped[int | None] = mapped_column(Integer, default=None)
    bathrooms: Mapped[int | None] = mapped_column(Integer, default=None)
    furnished: Mapped[bool | None] = mapped_column(Boolean, default=None)

    property: Mapped["Property"] = relationship(back_populates="units")
    beds_or_spaces: Mapped[list["BedOrSpace"]] = relationship(back_populates="unit")


class BedOrSpace(Base):
    __tablename__ = "beds_or_spaces"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    unit_id: Mapped[str] = mapped_column(ForeignKey("public.units.id"))
    label: Mapped[str | None] = mapped_column(String, default=None)
    is_vacant: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    unit: Mapped["Unit"] = relationship(back_populates="beds_or_spaces")


class PropertyCategory(Base):
    __tablename__ = "property_categories"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    key: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[str] = mapped_column(String)


class UnitCategory(Base):
    __tablename__ = "unit_categories"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    key: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[str] = mapped_column(String)


class Amenity(Base):
    __tablename__ = "amenities"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    key: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[str] = mapped_column(String)


class PropertyAmenity(Base):
    __tablename__ = "property_amenities"
    __table_args__ = {"schema": "public"}

    property_id: Mapped[str] = mapped_column(ForeignKey("public.properties.id"), primary_key=True)
    amenity_id: Mapped[str] = mapped_column(ForeignKey("public.amenities.id"), primary_key=True)
    detail: Mapped[str | None] = mapped_column(String, default=None)


class UnitAmenity(Base):
    __tablename__ = "unit_amenities"
    __table_args__ = {"schema": "public"}

    unit_id: Mapped[str] = mapped_column(ForeignKey("public.units.id"), primary_key=True)
    amenity_id: Mapped[str] = mapped_column(ForeignKey("public.amenities.id"), primary_key=True)
    detail: Mapped[str | None] = mapped_column(String, default=None)


class Utility(Base):
    __tablename__ = "utilities"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    key: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[str] = mapped_column(String)


class PropertyUtility(Base):
    __tablename__ = "property_utilities"
    __table_args__ = {"schema": "public"}

    property_id: Mapped[str] = mapped_column(ForeignKey("public.properties.id"), primary_key=True)
    utility_id: Mapped[str] = mapped_column(ForeignKey("public.utilities.id"), primary_key=True)
    internet_provider_id: Mapped[str | None] = mapped_column(
        ForeignKey("public.internet_providers.id"), default=None
    )
    detail: Mapped[str | None] = mapped_column(String, default=None)
    charge_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), default=None)
    charge_basis: Mapped[str | None] = mapped_column(String, default=None)


class Media(Base):
    __tablename__ = "media"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    property_id: Mapped[str] = mapped_column(ForeignKey("public.properties.id"))
    type: Mapped[str] = mapped_column(String)
    category: Mapped[str | None] = mapped_column(String, default=None)
    storage_key: Mapped[str] = mapped_column(String)
    alt_text: Mapped[str | None] = mapped_column(String, default=None)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    property: Mapped["Property"] = relationship(back_populates="media")


class FloorPlan(Base):
    __tablename__ = "floor_plans"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    property_id: Mapped[str] = mapped_column(ForeignKey("public.properties.id"))
    storage_key: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class VirtualTour(Base):
    __tablename__ = "virtual_tours"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    property_id: Mapped[str] = mapped_column(ForeignKey("public.properties.id"))
    provider: Mapped[str | None] = mapped_column(String, default=None)
    url: Mapped[str | None] = mapped_column(String, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PropertyCampus(Base):
    __tablename__ = "property_campuses"
    __table_args__ = (
        UniqueConstraint("property_id", "campus_id"),
        {"schema": "public"},
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    property_id: Mapped[str] = mapped_column(ForeignKey("public.properties.id"))
    campus_id: Mapped[str] = mapped_column(ForeignKey("public.campuses.id"))
    university_id: Mapped[str] = mapped_column(ForeignKey("public.universities.id"))
    straight_line_km: Mapped[float | None] = mapped_column(Float, default=None)
    walking_minutes: Mapped[int | None] = mapped_column(Integer, default=None)
    driving_minutes: Mapped[int | None] = mapped_column(Integer, default=None)
    public_transport_minutes: Mapped[int | None] = mapped_column(Integer, default=None)
    distance_source: Mapped[str | None] = mapped_column(String, default="SOURCE_SUPPLIED")
    distance_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)


class AvailabilityPeriod(Base):
    __tablename__ = "availability_periods"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    property_id: Mapped[str] = mapped_column(ForeignKey("public.properties.id"))
    available_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    available_unit_count: Mapped[int | None] = mapped_column(Integer, default=None)
    verification_status: Mapped[str] = mapped_column(String, default="EXPIRED")
    last_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AvailabilitySnapshot(Base):
    __tablename__ = "availability_snapshots"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    availability_period_id: Mapped[str] = mapped_column(ForeignKey("public.availability_periods.id"))
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    available_unit_count: Mapped[int | None] = mapped_column(Integer, default=None)


class ListingVersion(Base):
    __tablename__ = "listing_versions"
    __table_args__ = (
        UniqueConstraint("property_id", "version_number"),
        {"schema": "public"},
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    property_id: Mapped[str] = mapped_column(ForeignKey("public.properties.id"))
    version_number: Mapped[int] = mapped_column(Integer)
    snapshot_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by: Mapped[str | None] = mapped_column(String, default=None)


class ListingVerificationBadge(Base):
    __tablename__ = "listing_verification_badges"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    property_id: Mapped[str] = mapped_column(ForeignKey("public.properties.id"))
    badge_type: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="UNVERIFIED")
    issued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)


class ListingReport(Base):
    __tablename__ = "listing_reports"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    property_id: Mapped[str] = mapped_column(ForeignKey("public.properties.id"))
    reporter_id: Mapped[str | None] = mapped_column(String, default=None)
    reason: Mapped[str] = mapped_column(String)
    details: Mapped[str | None] = mapped_column(String, default=None)
    status: Mapped[str] = mapped_column(String, default="OPEN")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PricingRule(Base):
    __tablename__ = "pricing_rules"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    property_id: Mapped[str] = mapped_column(ForeignKey("public.properties.id"))
    unit_id: Mapped[str | None] = mapped_column(ForeignKey("public.units.id"), default=None)
    rent_amount_min: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    rent_amount_max: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), default=None)
    currency: Mapped[str] = mapped_column(String, default="KES")
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    effective_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    property: Mapped["Property"] = relationship(back_populates="pricing_rules")


class Deposit(Base):
    __tablename__ = "deposits"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    property_id: Mapped[str] = mapped_column(ForeignKey("public.properties.id"))
    amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), default=None)
    basis: Mapped[str | None] = mapped_column(String, default=None)
    refund_policy_days: Mapped[int | None] = mapped_column(Integer, default=None)


class Fee(Base):
    __tablename__ = "fees"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    property_id: Mapped[str] = mapped_column(ForeignKey("public.properties.id"))
    fee_type: Mapped[str] = mapped_column(String)
    amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), default=None)
    basis: Mapped[str | None] = mapped_column(String, default=None)


class CancellationPolicy(Base):
    __tablename__ = "cancellation_policies"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    key: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(String, default=None)


class HouseRule(Base):
    __tablename__ = "house_rules"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    property_id: Mapped[str] = mapped_column(ForeignKey("public.properties.id"))
    rule_type: Mapped[str] = mapped_column(String)
    detail: Mapped[str | None] = mapped_column(String, default=None)


class TenancyTemplate(Base):
    __tablename__ = "tenancy_templates"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    name: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TenancyTemplateVersion(Base):
    __tablename__ = "tenancy_template_versions"
    __table_args__ = (
        UniqueConstraint("template_id", "version"),
        {"schema": "public"},
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    template_id: Mapped[str] = mapped_column(ForeignKey("public.tenancy_templates.id"))
    version: Mapped[int] = mapped_column(Integer)
    body_markdown: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
