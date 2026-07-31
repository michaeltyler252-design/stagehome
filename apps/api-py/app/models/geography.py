"""Geography and education models — direct port of schema.prisma's
"GEOGRAPHY AND EDUCATION" section."""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, VerificationMixin, cuid


class County(Base, VerificationMixin, TimestampMixin):
    __tablename__ = "counties"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    name: Mapped[str] = mapped_column(String, unique=True)
    slug: Mapped[str] = mapped_column(String, unique=True)
    rollout_phase: Mapped[int | None] = mapped_column(Integer, default=None)
    centroid_lat: Mapped[float | None] = mapped_column(Float, default=None)
    centroid_lng: Mapped[float | None] = mapped_column(Float, default=None)

    sub_counties: Mapped[list["SubCounty"]] = relationship(back_populates="county")
    universities: Mapped[list["University"]] = relationship(back_populates="county")


class SubCounty(Base, VerificationMixin, TimestampMixin):
    __tablename__ = "sub_counties"
    __table_args__ = (
        UniqueConstraint("county_id", "slug"),
        {"schema": "public"},
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    county_id: Mapped[str] = mapped_column(ForeignKey("public.counties.id"))
    name: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String)

    county: Mapped["County"] = relationship(back_populates="sub_counties")
    towns: Mapped[list["Town"]] = relationship(back_populates="sub_county")


class Town(Base, VerificationMixin, TimestampMixin):
    __tablename__ = "towns"
    __table_args__ = (
        UniqueConstraint("sub_county_id", "slug"),
        {"schema": "public"},
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    sub_county_id: Mapped[str] = mapped_column(ForeignKey("public.sub_counties.id"))
    name: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String)

    sub_county: Mapped["SubCounty"] = relationship(back_populates="towns")
    estates: Mapped[list["Estate"]] = relationship(back_populates="town")


class Estate(Base, VerificationMixin, TimestampMixin):
    __tablename__ = "estates"
    __table_args__ = (
        UniqueConstraint("town_id", "slug"),
        {"schema": "public"},
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    town_id: Mapped[str] = mapped_column(ForeignKey("public.towns.id"))
    name: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(String, default=None)
    centroid_lat: Mapped[float | None] = mapped_column(Float, default=None)
    centroid_lng: Mapped[float | None] = mapped_column(Float, default=None)

    town: Mapped["Town"] = relationship(back_populates="estates")


class University(Base, VerificationMixin, TimestampMixin):
    __tablename__ = "universities"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    county_id: Mapped[str] = mapped_column(ForeignKey("public.counties.id"))
    official_name: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String, unique=True)
    type: Mapped[str | None] = mapped_column(String, default=None)  # public | private
    accreditation_status: Mapped[str | None] = mapped_column(
        String, default="Verification Required"
    )
    website: Mapped[str | None] = mapped_column(String, default=None)

    county: Mapped["County"] = relationship(back_populates="universities")
    aliases: Mapped[list["UniversityAlias"]] = relationship(back_populates="university")
    campuses: Mapped[list["Campus"]] = relationship(back_populates="university")


class UniversityAlias(Base):
    __tablename__ = "university_aliases"
    __table_args__ = (
        UniqueConstraint("university_id", "alias"),
        {"schema": "public"},
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    university_id: Mapped[str] = mapped_column(ForeignKey("public.universities.id"))
    alias: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    university: Mapped["University"] = relationship(back_populates="aliases")


class Campus(Base, VerificationMixin, TimestampMixin):
    __tablename__ = "campuses"
    __table_args__ = (
        UniqueConstraint("university_id", "slug"),
        {"schema": "public"},
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    university_id: Mapped[str] = mapped_column(ForeignKey("public.universities.id"))
    name: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String)
    campus_status: Mapped[str | None] = mapped_column(String, default="Verification Required")
    latitude: Mapped[float | None] = mapped_column(Float, default=None)
    longitude: Mapped[float | None] = mapped_column(Float, default=None)

    university: Mapped["University"] = relationship(back_populates="campuses")


class CampusEstate(Base):
    __tablename__ = "campus_estates"
    __table_args__ = (
        UniqueConstraint("campus_id", "estate_id"),
        {"schema": "public"},
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    campus_id: Mapped[str] = mapped_column(ForeignKey("public.campuses.id"))
    estate_id: Mapped[str] = mapped_column(ForeignKey("public.estates.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PointOfInterest(Base, VerificationMixin, TimestampMixin):
    __tablename__ = "points_of_interest"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    category: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    latitude: Mapped[float | None] = mapped_column(Float, default=None)
    longitude: Mapped[float | None] = mapped_column(Float, default=None)


class TransportStop(Base, VerificationMixin, TimestampMixin):
    __tablename__ = "transport_stops"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    name: Mapped[str] = mapped_column(String)
    mode: Mapped[str | None] = mapped_column(String, default=None)
    latitude: Mapped[float | None] = mapped_column(Float, default=None)
    longitude: Mapped[float | None] = mapped_column(Float, default=None)


class InternetProvider(Base):
    __tablename__ = "internet_providers"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    name: Mapped[str] = mapped_column(String, unique=True)
    technology: Mapped[str | None] = mapped_column(String, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SourceRecord(Base):
    __tablename__ = "source_records"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    source_file: Mapped[str] = mapped_column(String)
    entity_type: Mapped[str] = mapped_column(String, index=True)
    entity_id: Mapped[str | None] = mapped_column(String, index=True, default=None)
    raw_excerpt: Mapped[str | None] = mapped_column(String, default=None)
    import_batch: Mapped[str | None] = mapped_column(String, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class VerificationEvent(Base):
    __tablename__ = "verification_events"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    source_record_id: Mapped[str | None] = mapped_column(
        ForeignKey("public.source_records.id"), default=None
    )
    entity_type: Mapped[str] = mapped_column(String, index=True)
    entity_id: Mapped[str] = mapped_column(String, index=True)
    previous_status: Mapped[str] = mapped_column(String)
    new_status: Mapped[str] = mapped_column(String)
    method: Mapped[str | None] = mapped_column(String, default=None)
    performed_by: Mapped[str | None] = mapped_column(String, default=None)
    evidence_url: Mapped[str | None] = mapped_column(String, default=None)
    notes: Mapped[str | None] = mapped_column(String, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
