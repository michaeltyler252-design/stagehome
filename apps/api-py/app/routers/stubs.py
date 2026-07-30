"""
Everything previously stubbed here (organisations, properties, bookings,
payments, agreements, reviews, blog, support, dashboards, verification)
has now been fully ported to its own router — see main.py's router list.

What remains genuinely unported: auth refresh/logout/Google OAuth/phone
OTP/admin MFA — those routes already exist in app/routers/auth.py,
still returning 501 there. See MIGRATION.md "Remaining work".

Nothing is declared in this file anymore — kept only so main.py's
import doesn't break, and as a marker for future work.
"""

from fastapi import APIRouter

router = APIRouter(tags=["not-yet-ported"])
