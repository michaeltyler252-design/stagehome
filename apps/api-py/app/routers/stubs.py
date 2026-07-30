"""
Every route that was ever stubbed in this file has now been fully
ported to its own real router — organisations, properties, bookings,
payments, agreements, reviews, blog, support, dashboards, verification,
and (as of this round) auth refresh/logout/OTP/admin-MFA/Google OAuth.

Nothing is declared in this file anymore. Kept only so main.py's import
doesn't break, and as a historical marker of where this project's
migration started from.
"""

from fastapi import APIRouter

router = APIRouter(tags=["not-yet-ported"])
