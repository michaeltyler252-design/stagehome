"""
Every route below preserves its EXACT path and HTTP method from the
original NestJS controllers (see INVENTORY.md for the source-of-truth
list), so the frontend's api-client.ts needs zero URL changes once these
are fully ported. Each currently returns 501 with a pointer to the
corresponding original file to port from — see MIGRATION.md for the
prioritized list of what's genuinely left to do, and why these specific
ones were deferred (mostly: they involve real money movement, e-signature,
or multi-step state machines, and deserve the same rigor — real port +
real tests + real Postgres verification — that auth/public/favourites/
notifications got, rather than a rushed implementation).
"""

from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["not-yet-ported"])


def _not_ported(source_file: str):
    async def handler():
        raise HTTPException(
            status_code=501,
            detail=f"Not yet ported from {source_file} — see MIGRATION.md 'Remaining work'.",
        )

    return handler


# --- Organisations ---
router.add_api_route("/organisations", _not_ported("organisations/organisations.controller.ts"), methods=["POST"])
router.add_api_route("/organisations/mine", _not_ported("organisations/organisations.controller.ts"), methods=["GET"])

# --- Properties (manager CRUD) ---
router.add_api_route("/organisations/{organisation_id}/properties", _not_ported("properties/properties.controller.ts"), methods=["POST"])
router.add_api_route("/organisations/{organisation_id}/properties", _not_ported("properties/properties.controller.ts"), methods=["GET"])
router.add_api_route("/properties/{property_id}", _not_ported("properties/properties.controller.ts"), methods=["GET"])
router.add_api_route("/properties/{property_id}", _not_ported("properties/properties.controller.ts"), methods=["PATCH"])
router.add_api_route("/properties/{property_id}/submit-for-verification", _not_ported("properties/properties.controller.ts"), methods=["POST"])
router.add_api_route("/properties/{property_id}/units", _not_ported("properties/properties.controller.ts"), methods=["POST"])

# --- Bookings ---
router.add_api_route("/units/{unit_id}/quotes", _not_ported("bookings/bookings.controller.ts"), methods=["POST"])
router.add_api_route("/quotes/{quote_id}/hold", _not_ported("bookings/bookings.controller.ts"), methods=["POST"])
router.add_api_route("/holds/{hold_id}/confirm", _not_ported("bookings/bookings.controller.ts"), methods=["POST"])
router.add_api_route("/bookings/{booking_id}/cancel", _not_ported("bookings/bookings.controller.ts"), methods=["POST"])
router.add_api_route("/bookings/mine", _not_ported("bookings/bookings.controller.ts"), methods=["GET"])

# --- Payments (M-Pesa/Daraja — no real credentials configured yet regardless of language) ---
router.add_api_route("/payments/initiate", _not_ported("payments/payments.controller.ts"), methods=["POST"])
router.add_api_route("/payments/callback/mpesa", _not_ported("payments/payments.controller.ts"), methods=["POST"])
router.add_api_route("/payments/{payment_id}/refund", _not_ported("payments/payments.controller.ts"), methods=["POST"])
router.add_api_route("/payments/refunds/{refund_id}/approve", _not_ported("payments/payments.controller.ts"), methods=["POST"])

# --- Agreements (e-signature) ---
router.add_api_route("/bookings/{booking_id}/agreements", _not_ported("agreements/agreements.controller.ts"), methods=["POST"])
router.add_api_route("/agreements/sign/{token}", _not_ported("agreements/agreements.controller.ts"), methods=["GET"])
router.add_api_route("/agreements/sign/{token}", _not_ported("agreements/agreements.controller.ts"), methods=["POST"])

# --- Reviews ---
router.add_api_route("/public/properties/{property_id}/reviews", _not_ported("reviews/reviews.controller.ts"), methods=["GET"])
router.add_api_route("/bookings/{booking_id}/reviews", _not_ported("reviews/reviews.controller.ts"), methods=["POST"])
router.add_api_route("/reviews/{review_id}/responses", _not_ported("reviews/reviews.controller.ts"), methods=["POST"])

# --- Blog ---
router.add_api_route("/public/blog", _not_ported("blog/blog.controller.ts"), methods=["GET"])
router.add_api_route("/public/blog/{slug}", _not_ported("blog/blog.controller.ts"), methods=["GET"])
router.add_api_route("/admin/blog", _not_ported("blog/blog.controller.ts"), methods=["GET"])
router.add_api_route("/admin/blog", _not_ported("blog/blog.controller.ts"), methods=["POST"])
router.add_api_route("/admin/blog/{blog_id}", _not_ported("blog/blog.controller.ts"), methods=["PATCH"])
router.add_api_route("/admin/blog/{blog_id}/publish", _not_ported("blog/blog.controller.ts"), methods=["POST"])
router.add_api_route("/admin/blog/{blog_id}/unpublish", _not_ported("blog/blog.controller.ts"), methods=["POST"])

# --- Support ---
router.add_api_route("/support/tickets", _not_ported("support/support.controller.ts"), methods=["POST"])
router.add_api_route("/support/tickets/mine", _not_ported("support/support.controller.ts"), methods=["GET"])
router.add_api_route("/support/tickets/{ticket_id}/messages", _not_ported("support/support.controller.ts"), methods=["POST"])
router.add_api_route("/support/tickets/all", _not_ported("support/support.controller.ts"), methods=["GET"])
router.add_api_route("/support/tickets/{ticket_id}/status", _not_ported("support/support.controller.ts"), methods=["PATCH"])

# --- Dashboards ---
router.add_api_route("/dashboard/tenant", _not_ported("dashboards/dashboards.controller.ts"), methods=["GET"])
router.add_api_route("/dashboard/manager/{organisation_id}", _not_ported("dashboards/dashboards.controller.ts"), methods=["GET"])
router.add_api_route("/dashboard/admin", _not_ported("dashboards/dashboards.controller.ts"), methods=["GET"])

# --- Admin verification (property + university promotion/verification) ---
router.add_api_route("/admin/verification/queue", _not_ported("verification/verification.controller.ts"), methods=["GET"])
router.add_api_route("/admin/verification/properties/{property_id}/approve", _not_ported("verification/verification.controller.ts"), methods=["POST"])
router.add_api_route("/admin/verification/properties/{property_id}/publish", _not_ported("verification/verification.controller.ts"), methods=["POST"])
router.add_api_route("/admin/verification/properties/{property_id}/reject", _not_ported("verification/verification.controller.ts"), methods=["POST"])
router.add_api_route("/admin/verification/properties/promotion-queue", _not_ported("verification/property-promotion.controller.ts"), methods=["GET"])
router.add_api_route("/admin/verification/properties/{raw_property_record_id}/promote", _not_ported("verification/property-promotion.controller.ts"), methods=["POST"])
router.add_api_route("/admin/verification/universities/promotion-queue", _not_ported("verification/university-verification.controller.ts"), methods=["GET"])
router.add_api_route("/admin/verification/universities/verification-queue", _not_ported("verification/university-verification.controller.ts"), methods=["GET"])
router.add_api_route("/admin/verification/universities/{raw_university_record_id}/promote", _not_ported("verification/university-verification.controller.ts"), methods=["POST"])
router.add_api_route("/admin/verification/universities/{university_id}/verify", _not_ported("verification/university-verification.controller.ts"), methods=["POST"])
router.add_api_route("/admin/verification/universities/{university_id}/reject", _not_ported("verification/university-verification.controller.ts"), methods=["POST"])

# --- Admin MFA ---
router.add_api_route("/auth/admin-mfa/setup", _not_ported("auth/admin-mfa.controller.ts"), methods=["POST"])
router.add_api_route("/auth/admin-mfa/verify", _not_ported("auth/admin-mfa.controller.ts"), methods=["POST"])
