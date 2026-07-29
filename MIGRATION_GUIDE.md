# Database Migration Guide

## Prerequisites
- PostgreSQL 15+ with the `postgis` and `pg_trgm` extensions available
  (the `postgis/postgis` Docker image, used in `docker-compose.yml`,
  includes both).
- Node.js 20+, pnpm 9+.

## First-time setup

```bash
cd packages/database
pnpm install
cp .env.example .env   # set DATABASE_URL to your real Postgres connection string
pnpm prisma:generate
pnpm prisma:migrate:dev --name init
```

`prisma:migrate:dev` will create the extensions, both Postgres schemas
(`public` and `staging`), and all 95 models (including `BlogPost`, added
after this delivery's audit — no migration file exists yet for it; the
very first `prisma:migrate:dev --name init` run in a real environment will
generate one migration covering the entire schema, `BlogPost` included).
**This exact command has never been run successfully from this project's
development environment** — every sandbox it was built and audited in has
had no network access to Prisma's engine-binary host
(`binaries.prisma.sh`). Run it in a real environment with normal internet
access before relying on anything downstream.

## Seeding

```bash
pnpm prisma:seed
```
This populates **lookup/taxonomy data only** — property categories, unit
categories, amenities, utilities, roles, permissions, cancellation-policy
types, and the 15 Phase-1 rollout counties with their rollout-phase
numbers. It deliberately does **not** create any property, university,
user, or booking — see `docs/operations/seed-strategy.md` for why.

## Loading real county data

```bash
pnpm staging:import:nairobi
pnpm staging:import:kiambu
pnpm staging:import:nakuru
pnpm staging:import:kisumu
pnpm staging:import:embu
pnpm staging:import:meru
pnpm staging:import:tharaka-nithi
pnpm staging:import:machakos
pnpm staging:import:uasin-gishu
pnpm staging:import:kakamega
pnpm staging:import:nyeri
pnpm staging:import:kirinyaga
pnpm staging:import:muranga
pnpm staging:import:kisii
pnpm staging:import:mombasa
pnpm staging:import:kitui
pnpm staging:import:elgeyo-marakwet
pnpm staging:import:nandi
pnpm staging:import:baringo
pnpm staging:import:laikipia
pnpm staging:import:vihiga
pnpm staging:import:bungoma
pnpm staging:import:busia
pnpm staging:import:siaya
pnpm staging:import:homa-bay
```
Every import is idempotent (checksummed) — re-running one that hasn't
changed is a safe no-op. All data lands in the `staging` schema, invisible
to the public API, until an admin promotes it through the verification
workflow. These 25 counties are the ones with real imported source data
today (`COUNTIES_WITH_DATA` in `src/seed/rollout-counties.ts` — used for
staging-import tracking only; the *public* `/counties` page gates on live
published/verified data, not this list). The remaining 22 of the 47
seeded counties exist in the lookup table but have no source data yet.

## Promoting and verifying universities

Staging import only writes to `staging.raw_university_records`. Two more
steps make a university actually appear on the public site:

```bash
pnpm staging:promote-universities   # bulk-promotes staged records to PENDING
```
Then an Admin must confirm each one against the Commission for University
Education register via `POST /admin/verification/universities/:id/verify`
(or the `/admin/verification` page in the web app) to move it to VERIFIED —
only VERIFIED universities are public. See "Default admin setup" in the
root `README.md` for how to become an Admin at all, since nothing does
this automatically.

For local/dev/staging environments only, `pnpm dev:promote-and-verify-universities`
does both steps at once (refuses to run unless `NODE_ENV` is `development`
or `test` — never a real CUE-register check, never for production).

## Promoting, approving, and publishing properties

Staging import also only writes to `staging.raw_property_records`. Getting
a property all the way to the public site takes three more steps:

```bash
pnpm staging:promote-properties        # staged records -> REVIEW properties
```
Then an Admin reviews each one via the `/admin/verification` page (or
`POST /admin/verification/properties/:id/approve`, then `:id/publish`) —
`publish()` additionally enforces `APPROVED_COUNTY_SLUGS`
(currently `nairobi-city`, `kiambu`, `nakuru` — see
`apps/api/src/verification/verification.service.ts`), so a property in any
other county will reach `APPROVED` but stay unpublished until its county is
explicitly approved.

For local/dev/test environments only, `pnpm dev:seed-search-data` runs the
entire pipeline — import, promote, approve, publish — for the three
currently-approved counties in one command, using only the real Kenyan
source data already bundled in `prisma/seed-data/`. Pair it with
`pnpm dev:promote-and-verify-universities` for full demo data across both
universities and properties.

## Detecting duplicates

```bash
pnpm staging:detect-duplicates <batchKey>
# e.g. pnpm staging:detect-duplicates nairobi-phase1-milestone1-audit
```
Flags (never auto-merges) fuzzy-name-matched candidate duplicates within a
batch using PostgreSQL's `pg_trgm` similarity function.

## Production deploys

Use `prisma:migrate:deploy` (not `migrate:dev`) in CI/CD — it applies
already-committed migrations without prompting or generating new ones.

## Rolling back

Prisma doesn't auto-generate down-migrations. Keep a tested, restorable
backup (see `infrastructure/scripts/backup-database.sh`) before every
production migration — an untested backup is not a backup.
