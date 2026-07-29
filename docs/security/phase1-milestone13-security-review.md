# Phase 1 — Nairobi City — Milestone 13: Security and Privacy Review

This milestone is a systematic pass against Part M, not a rebuild. Findings
and fixes below, in the order I found them.

## 1. Brute-force protection — MISSING, now fixed

**Finding:** `/auth/login`, `/auth/register`, `/auth/otp/request`, and
`/auth/otp/verify` had no rate limiting. `OtpService` already capped wrong
OTP guesses at 5 per phone number, but nothing capped attempts *by IP*
across different phone numbers or against `/auth/login`.

**Fix:** `RateLimitGuard` — a Redis fixed-window counter keyed by IP+route,
applied via a `@RateLimit(limit, windowSeconds)` decorator: login (10/15min),
register (5/hour), OTP request (3/15min — also a cost control, each one is a
real SMS), OTP verify (10/15min). Every block writes a `SecurityEvent` row.
Tested directly, including that one route's traffic doesn't consume another
route's budget.

## 2. Refresh tokens stored in plaintext — fixed

**Finding:** `UserSession.refreshToken` stored the actual JWT refresh token.
A stolen database dump would have handed out valid sessions directly,
without needing the JWT signing secret at all — the exact failure mode
password hashing exists to prevent, just for sessions instead of passwords.

**Fix:** Only a SHA-256 hash of the refresh token is stored now; `refresh()`
and `logout()` hash the incoming token before the lookup. Tested that the
stored value is never the raw token.

## 3. No audit trail for admin actions — partially fixed

**Finding:** `audit_logs` existed in the schema since Milestone 1 but nothing
ever wrote to it. Property approve/reject/publish had domain-specific
`VerificationEvent` rows but no platform-wide audit entry.

**Fix:** `VerificationService.approve/publish/reject` now also write an
`AuditLog` row. **Not yet done:** refund approval, support-ticket status
changes, and organisation/property CRUD don't audit-log yet — flagged as
remaining work, not silently left out of this report.

## 4. Refund "dual control" wasn't actually dual — fixed

**Finding:** Milestone 8 flagged large refunds `requiresDualControl: true`
but there was no second approval action at all — "dual control" was a label
with no mechanism behind it, and `Refund` didn't even record who requested
one.

**Fix:** Added `Refund.requestedBy` to the schema. New
`PaymentsService.approveRefund()` refuses outright if the approver is the
same person who requested it, only when `requiresDualControl` is true. The
single most important test in this batch: "refuses to let the requester
approve their own dual-control refund."

## 5. No explicit Content-Security-Policy — fixed

**Finding:** `helmet()` was called with defaults only.

**Fix:** Explicit CSP (`default-src 'self'`, no inline scripts, no framing),
2-year HSTS with `preload`, and `strict-origin-when-cross-origin` referrer
policy. Style-src allows `'unsafe-inline'` specifically because Swagger UI
(served at `/api/v1/docs`) needs it — scoped narrowly rather than loosened
globally.

## 6. Dependency vulnerability scan — real finding, deliberately NOT auto-fixed

`npm audit` on the API's dependency tree: **0 critical, 29 high, 15
moderate, 3 low** (47 total). Nearly all of the high-severity ones are
transitive dev-tooling (`jest`, `@nestjs/cli`'s `@angular-devkit`/`webpack`
chain) — not shipped to production and not attacker-reachable.

**The one that matters:** `multer` (pulled in by `@nestjs/platform-express`)
has a high-severity advisory. `npm audit`'s own fix path requires bumping
`@nestjs/platform-express` from v10 to **v11 — a major version**. I did
**not** apply this automatically: a major-version bump to the framework's
HTTP layer needs its own dedicated testing pass across every controller,
not a drive-by dependency bump in a security-review milestone, and multer
itself isn't even in active use yet (file upload is deferred to the media
pipeline, `Information Required` on S3/R2 credentials). Recommending this as
a tracked action item before Milestone 4's media pipeline goes live, not
silently deferring it without saying so.

## What Part M items are already covered from earlier milestones (verified, not re-explained)

Argon2id password hashing, GPS privacy split (public/private lat-lng),
never logging OTPs/passwords, idempotent payment processing, replay-safe
payment callbacks, org-membership IDOR checks throughout Properties/
Bookings/Payments/Dashboards, Prisma parameterized queries (including the
one raw PostGIS query), `class-validator` whitelist+forbidNonWhitelisted
stripping unknown fields.

## What's still open (Milestone 14/15 or later territory)

- No HTTPS enforcement (deployment-gate item, Milestone 15).
- `sessionStorage`-based frontend tokens instead of httpOnly cookies
  (flagged since Milestone 7 — needs HTTPS first).
- Admin MFA (`AdminMfaController`, built in Milestone 3) exists but nothing
  currently *requires* it before sensitive admin actions — it's opt-in
  today, not enforced.
- Audit logging isn't complete across every sensitive action (see #3 above).

## Tests

**140 backend tests passing** (15 new). Backend typecheck clean.

## Exact next milestone

Phase 1, Milestone 14: QA (systematic test-coverage review, edge-case
sweep, manual verification checklist for anything not unit-testable in this
sandbox).

## Approval gate

Stopping here per Part B rule 12.
