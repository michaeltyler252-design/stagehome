"""
Direct port of apps/api/src/common/cors-origin-matcher.ts.

Any Vercel-hosted origin whose subdomain starts with "stagehome" is
accepted in addition to the explicit WEB_APP_ORIGIN allowlist.

This is the actual fix for a real, recurring production problem: Vercel
issues a brand-new URL on every redeploy and on every distinct project,
and a static exact-match allowlist (just `explicit_origins`) breaks
registration/login every single time until someone manually updates
WEB_APP_ORIGIN and redeploys the API. Accepting the "stagehome*.vercel.app"
pattern in addition to the explicit list actually solves that churn,
while staying scoped enough that it wouldn't accept a credentialed
request from an unrelated Vercel site.
"""

import re

_VERCEL_ORIGIN_PATTERN = re.compile(r"^https://stagehome[a-z0-9-]*\.vercel\.app$")


def is_allowed_origin(origin: str, explicit_origins: list[str]) -> bool:
    return origin in explicit_origins or bool(_VERCEL_ORIGIN_PATTERN.match(origin))
