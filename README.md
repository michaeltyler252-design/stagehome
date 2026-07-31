# StageHome — Kenyan Student Housing Marketplace

> **Architecture note (current):** This project is now a two-service,
> Python + Laravel stack only:
> - **`apps/api-py`** — FastAPI/SQLAlchemy/PostgreSQL/Redis/Celery backend.
>   See `apps/api-py/MIGRATION.md` for exactly what's ported and tested
>   (60 real tests passing) versus what's still in progress.
> - **`apps/web-laravel`** — Laravel 11/PHP 8.3 frontend, consuming the
>   FastAPI backend over HTTP. See `apps/web-laravel/MIGRATION_LARAVEL.md`
>   for an equally honest disclosure: this code is syntax-verified and
>   internally consistency-checked, but has never been booted against a
>   real Laravel installation (the sandbox that built it has no network
>   access to Packagist).
>
> The previous NestJS/TypeScript backend and Next.js/React frontend have
> been fully removed. Everything below this note is historical — it
> describes the old Node.js/pnpm stack and no longer reflects the
> current setup. Kept for the original project history rather than
> deleted outright; see the two MIGRATION docs above for what's actually
> true today.

## Prerequisites (historical — describes the removed Node.js stack)

- Node.js >= 20.11.0
- pnpm >= 9.0.0 (`corepack enable && corepack prepare pnpm@9.7.0 --activate`)
- Docker Desktop or Docker Engine + Compose plugin
- Git


## First-time setup

```bash
git clone <repo-url> student-housing-marketplace
cd student-housing-marketplace
pnpm install

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp packages/database/.env.example packages/database/.env

pnpm docker:up          # starts PostGIS + Redis
pnpm db:generate        # generates Prisma client
pnpm db:migrate:dev --name init   # creates the initial migration
pnpm db:seed            # lookup/taxonomy data only — no business data
pnpm --filter @student-housing/database staging:import:nairobi   # loads the 11 audited Nairobi records into staging
pnpm dev                # runs api, web, worker in parallel via Turborepo
```

## Repository layout

```text
student-housing-marketplace/
├── apps/
│   ├── web/       # Next.js public site and dashboards
│   ├── api/       # NestJS REST API (/api/v1)
│   └── worker/    # BullMQ background workers
├── packages/
│   ├── ui/
│   ├── database/  # Prisma schema + client (@student-housing/database)
│   ├── validation/
│   ├── types/
│   ├── config/
│   ├── eslint-config/
│   └── tsconfig/
├── infrastructure/
│   ├── docker/
│   ├── terraform/
│   ├── monitoring/
│   └── scripts/
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── research/
│   ├── data-quality/
│   ├── security/
│   ├── operations/
│   └── testing/
└── .github/workflows/
```

## Project status

**Completed milestones:**
- Milestone 1 — Project foundation, source-data audit, Nairobi verification plan
- Milestone 2 — Database and seed data
- Milestones 3–5 — Authentication and permissions, Property-management
  system, Public marketplace pages
- Milestone 6 — Search and filtering (PostGIS radius search, map bounds,
  all Part H sort options)
- Milestone 7 — Booking system (quote/hold/confirm/cancel with Redis-locked
  double-booking prevention and policy-snapshot freezing)
- Milestone 8 — Payment system (M-Pesa STK push, idempotent + replay-safe
  callback handling, real double-entry ledger, refund dual-control flagging)
- Milestone 9 — Agreements and signatures (authenticated signing links,
  document hashing, audit-evidence signature events, sealed-once-fully-signed
  with no silent post-signing replacement)
- Milestone 10 — Notifications and support (email/SMS/WhatsApp dispatch
  wired into agreements + payments, per-channel preference gating, support
  tickets with P0–P4 priority)
- Milestone 11 — Dashboards (tenant/manager/admin aggregate views, working
  admin verification queue UI)
- Milestone 12 — SEO (canonical URLs, Open Graph/Twitter cards, breadcrumb
  structured data, review-gated aggregate ratings, noindex on private
  routes, PWA manifest)
- Milestone 13 — Security and privacy review (rate limiting, hashed refresh
  tokens at rest, real dual-control refund enforcement, explicit CSP/HSTS,
  audit logging on verification actions, dependency vulnerability scan)
- Milestone 14 — QA (found and fixed a completely untested RBAC guard, a
  completely untested OTP service, a test-suite bug that silently skipped
  its own production-path assertions, and 2 real accessibility lint errors)
- Milestone 15 — Staging deployment (Dockerfiles, CD pipeline, structured
  logging, Sentry wiring, encrypted-backup template, and an honest go/no-go
  checklist — see
  `docs/operations/phase1-milestone15-staging-deployment.md`)

**Phase 1 (Nairobi City) is code-complete across all 15 milestones.**
It is **not** deployed or live — see the go/no-go checklist above. The
single largest unverified risk: no migration has ever been run against a
real database, in any environment, because this sandbox cannot reach
Prisma's engine-binary host.

**Kiambu County (Part C rollout phase 2) — Milestone 1 complete:**
source-data audit of all 3 Kiambu university/property pairs, verification
registers, and a generalised (Nairobi + Kiambu, extensible to all 15
counties) staging-import pipeline — see
`docs/architecture/kiambu-milestone1-audit.md`.

**Kiambu Milestones 2–14 — architectural readiness confirmed, not rebuilt:**
audited the entire codebase for county-specific hardcoding and found none —
every service (auth, properties, search, booking, payments, agreements,
notifications, dashboards) already works for any county's data. See
`docs/architecture/kiambu-milestones-2-14-readiness.md` (updated 2026-07-27:
the rollout phase gate has since been advanced — see below).

**Nakuru County (Part C rollout phase 3) — Milestone 1 complete:**
1 university, 1 property (Egerton University (Njoro) → Njoro Boulevard
Apartments) — the most complete single record audited so far. See
`docs/architecture/nakuru-milestone1-audit.md`. Same readiness status as
Kiambu: structurally ready, not launched.

**✅ Rollout data-availability gap fully closed.** Mombasa (phase 4), Kisii
(phase 12), and Murang'a (phase 15) originally had **zero source
property/university records anywhere in the master document**, despite
being in Part C's 15-county rollout list. Not fabricated to fill the gap —
all three have since received real data from a second, user-supplied
source: Murang'a and Mombasa are complete records; Kisii's is genuinely
incomplete (cuts off before Contact Details, blocking manager-outreach
verification specifically for that one). **All 15 rollout counties now
have at least some source data.** See
`docs/data-quality/phase1-rollout-data-availability-audit.md` for the full
history.

**Kisumu County (Part C rollout phase 5) — Milestone 1 complete:**
3 universities, 3 properties. One naming distinction flagged directly:
"Kisii University – Kisumu Campus" is Kisumu County coverage, not Kisii
County coverage (which has none) — see
`docs/architecture/kisumu-milestone1-audit.md`.

**Embu County (Part C rollout phase 6) — Milestone 1 complete:**
1 university, 1 property (University of Embu → Kamiri Plaza Apartments).
While extracting it, found and fully resolved a data-hygiene issue affecting
10 already-shipped Nairobi/Kiambu raw text files (a trailing fragment from
the next property in the source document's sequence) — took three passes
to fix properly, all documented rather than only showing the clean end
state. See `docs/data-quality/raw-text-bleed-addendum.md`.

**Meru County (Part C rollout phase 7) — Milestone 1 complete:**
1 university, 1 property (Meru University of Science and Technology (MUST)
→ Marimba House Residence), cleanly extracted with no bleed. See
`docs/architecture/meru-milestone1-audit.md`.

**Tharaka-Nithi County (Part C rollout phase 8) — Milestone 1 complete:**
1 university, 1 property (Chuka University → Almark Hostels), cleanly
extracted with no bleed. See
`docs/architecture/tharaka-nithi-milestone1-audit.md`.

**Machakos County (Part C rollout phase 9) — Milestone 1 complete:**
1 university, 1 property (Machakos University (MksU) → MksU View
Apartments). See `docs/architecture/machakos-milestone1-audit.md`.

**Uasin Gishu County (Part C rollout phase 10) — Milestone 1 complete:**
1 university, 1 property (Moi University → Pioneer Academic Residency). See
`docs/architecture/uasin-gishu-milestone1-audit.md`.

**Kakamega County (Part C rollout phase 11) — Milestone 1 complete:**
1 university, 1 property (Masinde Muliro University of Science and
Technology (MMUST) → Kakamega Boulevard Apartments). See
`docs/architecture/kakamega-milestone1-audit.md`.

**Nyeri County (Part C rollout phase 13) — Milestone 1 complete:**
2 genuine universities/properties audited. **Real finding:** a third record
nested under Nyeri's heading in the source (JOOUST / Bondo Central
Residencies) actually belongs to Siaya County per its own address field —
excluded from Nyeri's data rather than silently miscounted, with a
regression test guarding the exclusion. See
`docs/architecture/nyeri-milestone1-audit.md`.

**Kirinyaga County (Part C rollout phase 14) — Milestone 1 complete:**
1 university, 1 property (Kirinyaga University (KyU) → Kutus Boulevard
Apartments). See `docs/architecture/kirinyaga-milestone1-audit.md`.

**🏁 Full Phase 1 rollout audit complete** (at the time, for the master
document). Every county in Part C's 15-county rollout list that had source
data in the original master document (12 of 15) got a Milestone 1 audit:
Nairobi, Kiambu, Nakuru, Kisumu, Embu, Meru, Tharaka-Nithi, Machakos, Uasin
Gishu, Kakamega, Nyeri, Kirinyaga. The remaining 3 (Mombasa, Kisii,
Murang'a) had zero source data at that point — see
`docs/data-quality/phase1-rollout-data-availability-audit.md`.

**Murang'a and Kisii audited from a second, user-supplied source:**
Murang'a University of Technology → Pioneer Plaza View (complete record),
and Kisii University → Nyabururu Academic Residency (**genuinely
incomplete as supplied** — cuts off before Contact Details, the only county
register missing that entirely). See
`docs/architecture/muranga-milestone1-audit.md` and
`docs/architecture/kisii-milestone1-audit.md`.

**🏁 Mombasa audited too — the rollout data-availability gap is fully
closed.** Technical University of Mombasa (TUM) → Tudor Crest Apartments,
a complete record from the same second source. **All 15 rollout counties
now have at least some source data; 14 of 15 have a usable record for
verification outreach** (every county except Kisii, whose one record still
lacks contact details). See `docs/architecture/mombasa-milestone1-audit.md`.
source data.

**Milestones 2–14 readiness confirmed for all 14 non-Nairobi audited
counties** (consolidated from the Kiambu-specific finding, since it was
always a codebase-wide fact, not a per-county one): zero county-specific
hardcoding anywhere in the platform — every feature already works for any
county's data. See `docs/architecture/all-counties-milestones-2-14-readiness.md`.

**🚀 Rollout phase advanced twice — 2026-07-27:** the original numeric
`CURRENT_ACTIVE_ROLLOUT_PHASE` moved from `1` → `2` (Kiambu), then `2` → `3`
(Nakuru), each following its own explicit approval. This removed the
code-level block on Nairobi, Kiambu, and Nakuru properties reaching
`PUBLISHED` once `APPROVED` — it did **not** mean any property in those
counties was verified or live. **This numeric mechanism has since been
replaced** (see below) — Nairobi, Kiambu, and Nakuru remain exactly the
three approved counties, now tracked as an explicit list rather than a
number.

**🗺️ Master county structure expanded to all 47 Kenyan counties, in a
specific operator-defined order — 2026-07-27.** This surfaced a real bug:
the old numeric phase gate assumed strictly sequential approval, but the
new order moved Nakuru from position 3 to position 11, no longer adjacent
to Nairobi/Kiambu. Fixed by replacing the numeric threshold with an
explicit `APPROVED_COUNTY_SLUGS` set
(`apps/api/src/verification/verification.service.ts`) that can't drift when
the county list is reordered. **This is now further superseded:**
`PublicService.listCounties()`/`getCountyBySlug()` no longer use a static
list at all — they query live `PUBLISHED` property and `VERIFIED`
university counts per county at request time, so a county appears or
disappears the moment its underlying data does, with no code change
required either way. See `CHANGELOG.md`.

**📦 10 new counties imported (25 of 47 now have real source data):**
Kitui, Elgeyo Marakwet, Nandi, Baringo, Laikipia, Vihiga (2 properties),
Bungoma, Busia, Siaya, and Homa Bay (**severely incomplete** — the source
cuts off before any pricing or contact details exist). A duplicate check
against every newly-supplied document confirmed the rest overlapped
byte-for-byte with already-imported data and correctly was not
re-imported. See `docs/data-quality/new-counties-batch-verification-register.md`
and `CHANGELOG.md` for the full report.

All source-supplied property and institution data is `SOURCE_SUPPLIED_UNVERIFIED`
until verified, and lives only in the `staging` schema until a human promotes
it. The public API only ever serves `publicationStatus: PUBLISHED` rows —
today, that means empty results, correctly. See `docs/data-quality/`.

**📝 Reviews & ratings, blog, legal pages, custom 404, footer links, and a
university admin UI — see `CHANGELOG.md` for full detail.**

**🏠 Property promotion pipeline — the real cause of an empty Search page,
not just missing data.** Properties had no equivalent to the university
promotion service at all: real, staged county data sat in
`staging.raw_property_records` with a `promotedPropertyId` column reserved
for exactly this, but nothing ever used it. Added `PropertyPromotionService`
(mirrors the university one), a bulk staging script
(`pnpm staging:promote-properties`), a Property promotion queue in
`/admin/verification`, and `pnpm dev:seed-search-data` — a dev-only script
that runs the full staging→promote→approve→publish pipeline for the three
currently-approved counties using only real bundled Kenyan source data.
See `CHANGELOG.md` and `MIGRATION_GUIDE.md`.

**🔌 Registration "Failed to fetch" — root cause identified and fixed in
code/docs, but not independently confirmable against a real deployed
environment (no access to it in this delivery).**
`ENVIRONMENT_VARIABLES.md` incorrectly called
`WEB_APP_ORIGIN`/`NEXT_PUBLIC_API_BASE_URL` "safe to use as-is" — corrected.
The API now refuses to boot in production with an unset `WEB_APP_ORIGIN`
instead of silently blocking all CORS traffic; the frontend now logs a
specific diagnostic if it's still pointed at `localhost` in a real
deployment; a new real HTTP-level e2e test suite
(`apps/api/src/__tests__/registration-and-cors.e2e.spec.ts`, via
`supertest`) proves the registration endpoint and CORS middleware work
correctly given correct config. See `CHANGELOG.md` and
`DEPLOYMENT_GUIDE.md`'s "Required environment variables" section.

## Default admin setup

There is no default/hardcoded admin account, and none is seeded — this is
intentional (shipping a fixed admin login is a real vulnerability). The
`Admin` `Role` row is seeded with every permission (`prisma:seed`), but
every user who registers through the normal sign-up flow always starts as
a `Tenant`. To bootstrap your first administrator:

```bash
# 1. Register a normal account through the web app's sign-up flow.
# 2. Grant it the Admin role directly against the database:
pnpm --filter @student-housing/database grant-admin-role -- you@example.com
# 3. Sign out and back in, so a fresh token includes the Admin role.
```
`grant-admin-role` is deliberately a CLI-only script, never an HTTP
endpoint — an API route that could grant Admin would let any authenticated
user self-promote.

## Manual steps after extracting this archive

1. `pnpm install` at the repo root.
2. `cp apps/api/.env.example apps/api/.env`, same for `apps/web` and
   `packages/database`, then fill in real secrets — see
   `ENVIRONMENT_VARIABLES.md`, **especially `WEB_APP_ORIGIN` and
   `NEXT_PUBLIC_API_BASE_URL`**, which have no safe production default and
   are the most common cause of a deployed site failing with "Failed to
   fetch" on registration/login.
3. Provision Postgres (with `postgis` + `pg_trgm`) and Redis.
4. Run `prisma:generate`, `prisma:migrate:dev --name init`, `prisma:seed`
   (see `MIGRATION_GUIDE.md`) — this has never been run in this project's
   own build/audit environments, all of which lacked internet access to
   `binaries.prisma.sh`.
5. Import county data, then promote/verify universities and
   promote/approve/publish properties (see `MIGRATION_GUIDE.md`) — or, for
   local development only, run `pnpm dev:promote-and-verify-universities`
   and `pnpm dev:seed-search-data` to do all of that automatically with
   real bundled Kenyan data.
6. Grant yourself the Admin role (see "Default admin setup" above).
7. Follow `DEPLOYMENT_GUIDE.md` for real deployment — especially its
   "Required environment variables" section.
