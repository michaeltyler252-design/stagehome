# Phase 1 — Nairobi City — Milestone 1: Project Foundation

## Architecture confirmation

Confirmed against Part D exactly as specified, no substitutions:

| Layer | Choice | Notes |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | `apps/{web,api,worker}`, `packages/{ui,database,validation,types,config,eslint-config,tsconfig}` |
| Frontend | Next.js App Router, React, TypeScript, Tailwind, shadcn/ui, React Hook Form, Zod, TanStack Query | Server components by default; PWA and WCAG work starts at Milestone 5 (public marketplace pages) |
| Backend | NestJS, TypeScript, REST under `/api/v1`, OpenAPI/Swagger, BullMQ, Redis | WebSockets deferred until a specific real-time feature justifies them, per Part D |
| Data | PostgreSQL + PostGIS, Prisma ORM, full-text search, `pg_trgm`, Redis | See schema at `packages/database/prisma/schema.prisma` |
| Media | S3 or R2, signed uploads, private identity-doc storage, CDN, AVIF/WebP, EXIF strip, malware scan, transcoding | Interfaces reserved in env inventory; implementation starts Milestone 4 |
| Maps | Google Maps Platform or Mapbox | Implementation starts Milestone 4/6; env var placeholders reserved now |
| Auth | Email/password, phone OTP, Google sign-in, passkeys later, admin MFA, Argon2id, RBAC | Implementation is Milestone 3; `roles`/`permissions`/`user_roles` tables exist now so Milestone 3 doesn't need a schema migration for its core shape |
| Payments | Daraja STK, Paybill/Till reconciliation, card gateway, Airtel Money, bank transfer, webhooks, idempotency, double-entry ledger | Implementation is Milestone 8; `payments`/`ledger_*` tables exist now for the same reason |
| Infrastructure | Docker, GitHub Actions, Cloudflare, managed Postgres/Redis, Sentry, structured logs, monitoring, encrypted backups | `docker-compose.yml` and `.github/workflows/ci.yml` created this milestone for local/dev parity; managed/production infra is a deployment-gate item (Milestone 15) |

**Architecture style:** modular monolith (Part B rule 17). `apps/api` is a
single NestJS application with feature modules; no service is split out
until scale or organisational boundaries justify it.

## Local prerequisites

- Node.js >= 20.11.0
- pnpm >= 9.0.0
- Docker Engine + Compose plugin (or Docker Desktop)
- Git

No cloud accounts are required to complete Milestone 1. Cloud accounts
(Cloudflare, S3/R2, Daraja, Google Maps, Sentry, etc.) are needed starting
the milestones that implement each integration — see the `.env.example`
files, which tag every variable with the milestone that first requires it.

## Nationwide entity model

Implemented as a single Prisma schema (`packages/database/prisma/schema.prisma`),
covering all seven Part F groups — Geography and education, Identity and
organisations, Property inventory, Commercial terms, Booking and payments,
Agreements, Engagement and operations — with no county-specific tables, per
Part F's explicit instruction. All 87 tables named in Part F are present
(cross-checked line-by-line against the spec — see the diff performed during
this milestone), plus three sensible junction/detail tables the spec implies
but doesn't name individually (`buildings`, as the parent of `units`;
`payment_allocations`, splitting a single payment across rent/deposit/fees;
`role_permissions`, the join table `user_roles`/`roles`/`permissions` needs).

Data-quality fields (`source_status`, `verification_status`, `source_file`,
`source_record_reference`, `source_url`, `verified_at`, `verified_by`,
`confidence_level`, `conflict_status`, `publication_status`, `notes`) are
applied in full to every table that can hold source-supplied external data:
the geography/education group and the property-inventory group. Transactional
tables (bookings, payments, agreements, engagement) carry operational status
enums instead, since the platform — never an external source — creates those
rows.

## Source-data import staging design

See `docs/data-quality/source-import-staging-design.md`.

## Duplicate/conflict detection design

See `docs/data-quality/duplicate-conflict-detection-design.md`.

## Nairobi verification registers

See `docs/data-quality/nairobi-institution-verification-register.md` and
`docs/data-quality/nairobi-property-verification-register.md`. Both flag a
real, unresolved issue found during the audit: Technical University of
Kenya's "Station View Residency" appears twice in the source under the same
heading, once truncated, and was not part of the master document's own
declared dedup pass. It is entered as a `FLAGGED` conflict, not silently
merged, per Part B rule 7.

## Seed strategy

See `docs/operations/seed-strategy.md`. Summary: lookup/taxonomy data only in
Milestone 1's seed script; the 11 audited Nairobi properties/universities
enter through the staging-import pipeline in Milestone 2, never as hard-coded
seed rows, so no business data is invented (Part B rule 4).

## Phase 1 acceptance criteria

Milestone 1 is complete when:

- [x] Monorepo builds locally (`pnpm install`, `pnpm db:generate` succeed)
- [x] `docker compose up -d` brings up PostGIS + Redis with healthchecks passing
- [x] `apps/api` boots and `/api/v1/health` returns `200 ok`
- [x] `apps/web` boots and serves the placeholder homepage
- [x] Prisma schema matches Part F's table list with zero omissions
- [x] Every environment variable in Parts D, J, L is inventoried with a safe
      placeholder or `Information Required`
- [x] Nairobi institution and property verification registers exist and
      identify every university/property pair from Part O's Nairobi section
- [x] The Station View Residency conflict is recorded, not silently resolved
- [x] Source-data import staging design and duplicate/conflict detection
      design are written and reference the actual schema tables that
      implement them
- [ ] Human approval received to begin Milestone 2

Remaining before Phase 1 as a whole (all 15 milestones) is complete: 14 more
milestones, each gated by its own approval per Part C.
