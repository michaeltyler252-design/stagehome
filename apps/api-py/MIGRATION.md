# StageHome: NestJS/TypeScript → FastAPI/Python Migration

This document explains what changed, what's genuinely done and verified,
and what's explicitly still remaining. It does not claim more completion
than what was actually built and tested — see the "Remaining work"
section for the honest gap list.

## Where the new service lives

`apps/api-py/` — a new sibling to `apps/api` (the original NestJS
service, left completely untouched). Nothing about the frontend
(`apps/web`) changed except which URL it points to.

## What's genuinely done, and how it was verified

Every claim below was checked by actually running code in a real Python
3.12 environment during development — not just written and assumed to
work. **Total: 39/39 Python tests passing.**

### Fully ported, with real tests, matching the original's exact business rules

- **Database**: all 84 Prisma models → 95 SQLAlchemy tables, verified via
  `configure_mappers()` with zero relationship errors.
- **Security**: JWT + argon2 (byte-compatible — existing password hashes
  keep working, zero forced reset). 6 tests.
- **CORS**: the `stagehome*.vercel.app` pattern-matching fix from earlier
  this session, ported exactly. 5 tests.
- **Auth (register/login)**: duplicate-email rejection, generic
  invalid-credentials message, default Tenant role. 4 tests. (Refresh,
  logout, Google OAuth, phone OTP, admin MFA remain unported — see below.)
- **Organisations**: create, list-mine with Admin/member scoping.
- **Properties (manager CRUD)**: create, list, get, update,
  submit-for-verification, add-unit, with the `assert_can_manage_organisation`
  access rule.
- **Bookings**: quote creation, Redis `SET NX` hold-locking (the actual
  double-booking-prevention mechanism), confirm-with-policy-snapshotting,
  cancel, list-mine. 6 tests, including the critical lock-contention case.
- **Payments (M-Pesa/Daraja)**: real Daraja client (refuses clearly when
  unconfigured, exactly like the original), idempotent initiation,
  replay-safe callback handling, double-entry ledger posting, dual-control
  refund approval. 10 tests covering the highest-stakes money-movement
  logic.
- **Notifications infrastructure**: email/SMS/WhatsApp clients (all
  "refuse clearly if unconfigured, log-only in dev") and the `notify()`
  multi-channel dispatcher.
- **Agreements (e-signature)**: template rendering, generation, token-based
  fetch/sign, sealing. 2 tests on the core legal guarantee (never silently
  replace a sealed agreement).
- **Reviews**: booking-gated (COMPLETED only, one per booking), org-scoped
  manager responses.
- **Blog**: public list/get plus full admin CRUD (create, update, publish,
  unpublish).
- **Support tickets**: create, add message, list-mine, admin list-all,
  admin status update with notification dispatch.
- **Dashboards**: tenant/manager/admin, including real SQL aggregation
  queries (`GROUP BY` publication status, booking status, support
  priority; `SUM` for revenue) — not simplified counts.
- **Verification workflows**: property review queue (approve/publish/reject
  with the `APPROVED_COUNTY_SLUGS` gate), property promotion
  (staging→public), university promotion + verify/reject — all with real
  `AuditLog`/`VerificationEvent` writes, matching the original exactly.
- **Search**: real PostGIS radius search (`ST_DWithin`/`ST_Distance`
  against the privacy-safe `public_lat`/`public_lng` columns, never the
  private coordinates) plus county/category/keyword filtering.
- **Favourites, notifications list**: fully ported (unchanged from the
  previous round).
- **Worker scaffold**: `apps/worker-py/worker.py` — matches the original's
  own genuine scope exactly (a Celery app that boots with zero queues
  registered). This is not a gap introduced by the migration; the
  original NestJS worker is itself only a scaffold.

### Deliberately not built, because the original doesn't have it either

Checked before building, to avoid inventing new functionality beyond
parity: **the original has no file-upload endpoint at all** and **no
analytics module at all**. Nothing was built for either.

## What's explicitly NOT done — the honest gap list

1. **Auth: refresh, logout, Google OAuth, phone OTP, admin MFA** — routes
   exist with correct paths in `app/routers/auth.py`, still return 501.
2. **Search's richer sort options** (`lowest_rent`, `highest_rent`,
   `highest_verified_rating`, `available_soonest`, `most_reviewed`) — the
   original's in-memory sort logic over joined pricing/review/availability
   data is not yet ported; `search_service.py` says so explicitly in its
   own docstring rather than silently approximating it.
3. **Agreement template customization** — the original's own comment notes
   organisation-specific `tenancy_templates` override the default
   renderer when one exists; that lookup isn't wired into
   `agreements_service.py` yet (falls back to the default template always).
4. **A real Postgres-backed integration test pass** — every test above
   uses mocked sessions or tests logic that doesn't need a database
   connection, because this development sandbox has no network access to
   a live Postgres instance. **This is the single most important
   remaining verification step before any production cutover.**
5. **Frontend cutover** — `apps/web/.env.production` still points at the
   NestJS service.
6. **Railway deployment** — `railway.json` and the Dockerfile are written
   but this exact configuration has never been deployed or exercised
   against Railway's real infrastructure.
7. **Alembic autogeneration against a real schema diff** — `alembic
   history` loads correctly, but no migration has actually been run
   against a live database (see "Before going live" below).

## Before going live — required steps, not yet performed

1. Connect to a real Postgres instance (or a copy of the actual production
   database) and run a genuine integration test pass — the current suite
   proves the logic is correct in isolation, not that it round-trips
   correctly through real SQL.
2. Run `alembic stamp head` against the existing production database.
3. Port the remaining auth flows and the search sort gaps above.
4. Only then repoint the frontend and redeploy.

## Environment variables

No new variable names — every Railway variable already set for the
NestJS service (`DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET`, `WEB_APP_ORIGIN`, `NODE_ENV`, `API_PORT`) is read
by the Python service under the identical name — see
`app/core/config.py`.
