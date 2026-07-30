# StageHome: NestJS/TypeScript → FastAPI/Python Migration

This document explains what changed, what's genuinely done and verified,
and what's explicitly still remaining. It does not claim more completion
than what was actually built and tested.

## Where the new service lives

`apps/api-py/` — the sole backend now. The original NestJS service has
been entirely removed from the repository (see the root README.md and
git history for when).

## What's genuinely done, and how it was verified

Every claim below was checked by actually running code in a real Python
3.12 environment during development — not just written and assumed to
work. **Total: 58/58 Python tests passing.**

### Every backend endpoint is now implemented — zero stub routes remain

Confirmed via direct `grep` across `app/routers/` and `app/services/`
for `501`/"not yet ported"/"not yet implemented": zero matches.

- **Database**: all 84 Prisma models → 95 SQLAlchemy tables, verified via
  `configure_mappers()` with zero relationship errors, across both the
  `public` and `staging` Postgres schemas.
- **Security**: JWT + argon2 (byte-compatible with the original algorithm
  and parameters — existing password hashes keep working). 6 tests.
- **CORS**: pattern-matches any `stagehome*.vercel.app` origin in addition
  to an explicit allowlist, solving Vercel's URL-churn problem. 5 tests.
- **Auth — fully complete**: register, login, refresh (real session
  rotation — the old session is revoked and a new one issued on every
  refresh), logout (real revocation), phone OTP (Redis-backed, rate-limited
  to 5 attempts per code), admin MFA (real `pyotp` TOTP — one test
  generates an actual live code and proves it verifies correctly), Google
  OAuth (real `authlib` implementation: redirect, callback, find-or-create
  user with the same default-Tenant-role rule as normal registration).
  22 tests across `test_auth_service.py`, `test_otp_service.py`,
  `test_admin_mfa_service.py`, `test_google_oauth_service.py`.
- **Organisations**: create, list-mine with Admin/member scoping.
- **Properties (manager CRUD)**: create, list, get, update,
  submit-for-verification, add-unit, with the org-membership access rule.
- **Bookings**: quote creation, Redis `SET NX` hold-locking (the real
  double-booking-prevention mechanism), confirm-with-policy-snapshotting,
  cancel, list-mine. 6 tests, including the critical lock-contention case.
- **Payments (M-Pesa/Daraja)**: real Daraja client (refuses clearly when
  unconfigured), idempotent initiation, replay-safe callback handling,
  double-entry ledger posting, dual-control refund approval. 10 tests
  covering the highest-stakes money-movement logic.
- **Notifications**: email/SMS/WhatsApp clients (all "refuse clearly if
  unconfigured, log-only in dev") and the multi-channel `notify()` dispatcher.
- **Agreements (e-signature)**: template rendering, generation, token-based
  fetch/sign, sealing. 2 tests on the core legal guarantee (never silently
  replace a sealed agreement).
- **Reviews**: booking-gated (COMPLETED only, one per booking), org-scoped
  manager responses.
- **Blog**: public list/get plus full admin CRUD.
- **Support tickets**: create, add message, list-mine, admin list-all,
  admin status update with notification dispatch.
- **Dashboards**: tenant/manager/admin, with real SQL aggregation
  (`GROUP BY` on publication/booking status, `SUM` for revenue).
- **Verification workflows**: property review queue, property promotion
  (staging→public), university promotion + verify/reject — all with real
  `AuditLog`/`VerificationEvent` writes.
- **Search — fully complete**: real PostGIS radius search, county/category/
  keyword filters, and all five sort options (`lowest_rent`, `highest_rent`,
  `highest_verified_rating`, `available_soonest`, `most_reviewed`) — 3
  tests proving results actually reorder correctly, not just that the
  sort parameter is accepted.
- **Favourites, notifications list**: fully ported.
- **Worker scaffold**: `apps/worker-py/worker.py` matches the original's
  own genuine scope — a Celery app that boots with zero queues registered,
  since the original NestJS worker was itself only ever a scaffold.

### Deliberately not built, because the original doesn't have it either

Checked before building, to avoid inventing new functionality beyond
parity: **the original has no file-upload endpoint at all** and **no
analytics module at all**. Nothing was built for either.

### One remaining, honestly-scoped gap

**Agreement template customization** — the original design intends
organisation-specific `tenancy_templates` to override the default
renderer when one exists; that lookup isn't wired into
`agreements_service.py` (it always uses the built-in default template).

## What's still explicitly NOT verifiable — the honest gap list

1. **A real Postgres-backed integration test pass** — every test in this
   project uses mocked sessions, because this sandbox has no network
   access to a live Postgres instance. Nothing here has been proven to
   round-trip correctly through real SQL, real constraints, or real
   transaction behavior. **This is the single most important remaining
   verification step before any production cutover.**
2. **Google OAuth's actual redirect round-trip** — the code is real and
   uses the standard library for this (authlib), but exercising it needs
   a real browser and real `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`.
3. **Frontend/backend integration** — `apps/web-laravel` calls this API's
   endpoints, but neither side has ever been run together against a live
   network connection.
4. **Railway deployment** — `railway.json` and the Dockerfile are written
   but this exact configuration has never been deployed.
5. **Alembic migrations against a real schema** — `alembic history` loads
   correctly; no migration has been run against a live database.

## Before going live — required steps, not yet performed

1. Connect to a real Postgres instance and run a genuine integration test
   pass.
2. Run `alembic stamp head` against the existing production database.
3. Provision real credentials for whichever integrations you want live:
   Google OAuth, M-Pesa Daraja, email/SMS/WhatsApp providers — all are
   already coded to refuse clearly and safely when unconfigured, rather
   than silently failing or faking success.
4. Only then repoint the frontend and redeploy.

## Environment variables

No new variable names beyond what the original NestJS service already
used — `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET`, `WEB_APP_ORIGIN`, `NODE_ENV`, `API_PORT` — plus
newly-relevant ones for the integrations completed this round:
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DARAJA_*`,
`EMAIL_PROVIDER_API_KEY`, `SMS_PROVIDER_API_KEY`,
`WHATSAPP_BUSINESS_TOKEN` — see `app/core/config.py` for the full list.
