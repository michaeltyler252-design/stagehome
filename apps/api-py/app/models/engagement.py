"""Engagement and operations models — direct port of schema.prisma's
"ENGAGEMENT AND OPERATIONS" section."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, JSON, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, PublicationStatus, cuid


class Favourite(Base):
    __tablename__ = "favourites"
    __table_args__ = (
        UniqueConstraint("user_id", "property_id"),
        {"schema": "public"},
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("public.users.id"))
    property_id: Mapped[str] = mapped_column(ForeignKey("public.properties.id"))
    created_at: Mapped[datetime]

    property: Mapped["Property"] = relationship()  # noqa: F821


class SavedSearch(Base):
    __tablename__ = "saved_searches"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("public.users.id"))
    filters_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime]

    alerts: Mapped[list["SearchAlert"]] = relationship(back_populates="saved_search")


class SearchAlert(Base):
    __tablename__ = "search_alerts"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    saved_search_id: Mapped[str] = mapped_column(ForeignKey("public.saved_searches.id"))
    frequency: Mapped[str] = mapped_column(String, default="DAILY")
    last_sent_at: Mapped[datetime | None] = mapped_column(default=None)

    saved_search: Mapped["SavedSearch"] = relationship(back_populates="alerts")


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    property_id: Mapped[str] = mapped_column(ForeignKey("public.properties.id"))
    # Only a verified stay may review.
    booking_id: Mapped[str] = mapped_column(ForeignKey("public.bookings.id"))
    user_id: Mapped[str] = mapped_column(ForeignKey("public.users.id"))
    overall_rating: Mapped[Decimal] = mapped_column(Numeric(2, 1))
    created_at: Mapped[datetime]

    categories: Mapped[list["ReviewCategory"]] = relationship(back_populates="review")
    responses: Mapped[list["ReviewResponse"]] = relationship(back_populates="review")


class ReviewCategory(Base):
    __tablename__ = "review_categories"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    review_id: Mapped[str] = mapped_column(ForeignKey("public.reviews.id"))
    category: Mapped[str] = mapped_column(String)
    rating: Mapped[Decimal] = mapped_column(Numeric(2, 1))

    review: Mapped["Review"] = relationship(back_populates="categories")


class ReviewResponse(Base):
    __tablename__ = "review_responses"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    review_id: Mapped[str] = mapped_column(ForeignKey("public.reviews.id"))
    responder_id: Mapped[str | None] = mapped_column(String, default=None)
    body: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime]

    review: Mapped["Review"] = relationship(back_populates="responses")


class BlogPost(Base):
    __tablename__ = "blog_posts"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    title: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String, unique=True)
    excerpt: Mapped[str] = mapped_column(String)
    body: Mapped[str] = mapped_column(String)
    cover_image_url: Mapped[str | None] = mapped_column(String, default=None)
    author_name: Mapped[str] = mapped_column(String)
    category: Mapped[str | None] = mapped_column(String, default=None)
    publication_status: Mapped[PublicationStatus] = mapped_column(default=PublicationStatus.DRAFT)
    published_at: Mapped[datetime | None] = mapped_column(default=None)
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]


class SupportTicket(Base):
    __tablename__ = "support_tickets"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("public.users.id"))
    priority: Mapped[str] = mapped_column(String, default="P4")
    status: Mapped[str] = mapped_column(String, default="OPEN")
    subject: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]

    messages: Mapped[list["SupportMessage"]] = relationship(back_populates="ticket")


class SupportMessage(Base):
    __tablename__ = "support_messages"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    ticket_id: Mapped[str] = mapped_column(ForeignKey("public.support_tickets.id"))
    author_id: Mapped[str | None] = mapped_column(String, default=None)
    body: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime]

    ticket: Mapped["SupportTicket"] = relationship(back_populates="messages")


class MaintenanceRequest(Base):
    __tablename__ = "maintenance_requests"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    property_id: Mapped[str] = mapped_column(ForeignKey("public.properties.id"))
    reported_by: Mapped[str | None] = mapped_column(String, default=None)
    description: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="OPEN")
    created_at: Mapped[datetime]


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("public.users.id"))
    channel: Mapped[str] = mapped_column(String)  # email | sms | in_app | whatsapp
    type: Mapped[str] = mapped_column(String)
    payload_json: Mapped[dict | None] = mapped_column(JSON, default=None)
    sent_at: Mapped[datetime | None] = mapped_column(default=None)
    created_at: Mapped[datetime]


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("public.users.id"), unique=True)
    email_opt_in: Mapped[bool] = mapped_column(Boolean, default=True)
    sms_opt_in: Mapped[bool] = mapped_column(Boolean, default=True)
    whatsapp_opt_in: Mapped[bool] = mapped_column(Boolean, default=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("public.users.id"), default=None)
    action: Mapped[str] = mapped_column(String)
    entity_type: Mapped[str | None] = mapped_column(String, index=True, default=None)
    entity_id: Mapped[str | None] = mapped_column(String, index=True, default=None)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, default=None)
    created_at: Mapped[datetime]


class SecurityEvent(Base):
    __tablename__ = "security_events"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    event_type: Mapped[str] = mapped_column(String)
    user_id: Mapped[str | None] = mapped_column(String, default=None)
    ip_address: Mapped[str | None] = mapped_column(String, default=None)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, default=None)
    created_at: Mapped[datetime]


class AdminNote(Base):
    __tablename__ = "admin_notes"
    __table_args__ = {"schema": "public"}

    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    subject_type: Mapped[str] = mapped_column(String, index=True)
    subject_id: Mapped[str] = mapped_column(String, index=True)
    author_id: Mapped[str | None] = mapped_column(String, default=None)
    body: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime]
