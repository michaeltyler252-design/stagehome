"""Staging schema — raw source-data import. Direct port of
schema.prisma's "STAGING SCHEMA" section.

Nothing in this group is ever read by the frontend or any public API
route. Only internal ETL scripts and the admin data-quality queue read
from it. Promotion to the canonical `public` schema tables is a separate,
explicit, logged step — never automatic."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, cuid


class RawImportBatch(Base):
    __tablename__ = "raw_import_batches"
    __table_args__ = {"schema": "staging"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    batch_key: Mapped[str] = mapped_column(String, unique=True)
    checksum: Mapped[str] = mapped_column(String)
    county: Mapped[str | None] = mapped_column(String, default=None)
    imported_by: Mapped[str | None] = mapped_column(String, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    property_records: Mapped[list["RawPropertyRecord"]] = relationship(back_populates="batch")
    university_records: Mapped[list["RawUniversityRecord"]] = relationship(back_populates="batch")


class RawPropertyRecord(Base):
    __tablename__ = "raw_property_records"
    __table_args__ = {"schema": "staging"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    batch_id: Mapped[str] = mapped_column(ForeignKey("staging.raw_import_batches.id"))
    property_name: Mapped[str] = mapped_column(String, index=True)
    university_name: Mapped[str | None] = mapped_column(String, default=None)
    source_file: Mapped[str | None] = mapped_column(String, default=None)
    raw_text: Mapped[str] = mapped_column(String)
    conflict_status: Mapped[str] = mapped_column(String, default="NONE")
    promoted_property_id: Mapped[str | None] = mapped_column(String, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    batch: Mapped["RawImportBatch"] = relationship(back_populates="property_records")


class RawUniversityRecord(Base):
    __tablename__ = "raw_university_records"
    __table_args__ = {"schema": "staging"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    batch_id: Mapped[str] = mapped_column(ForeignKey("staging.raw_import_batches.id"))
    university_name: Mapped[str] = mapped_column(String, index=True)
    campus_name: Mapped[str | None] = mapped_column(String, default=None)
    source_file: Mapped[str | None] = mapped_column(String, default=None)
    raw_excerpt: Mapped[str | None] = mapped_column(String, default=None)
    promoted_university_id: Mapped[str | None] = mapped_column(String, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    batch: Mapped["RawImportBatch"] = relationship(back_populates="university_records")


class RawFieldIssue(Base):
    __tablename__ = "raw_field_issues"
    __table_args__ = {"schema": "staging"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    batch_id: Mapped[str] = mapped_column(ForeignKey("staging.raw_import_batches.id"))
    record_type: Mapped[str] = mapped_column(String)
    record_ref: Mapped[str] = mapped_column(String)
    issue: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
