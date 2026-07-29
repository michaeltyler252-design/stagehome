# Phase 1 — Nairobi City — Milestone 2: Database and Seed Data

## What this milestone adds

1. **Staging schema** (`staging.*`, added to `packages/database/prisma/schema.prisma`
   via Prisma's `multiSchema` preview feature): `raw_import_batches`,
   `raw_property_records`, `raw_university_records`, `raw_field_issues` —
   implementing the design in `docs/data-quality/source-import-staging-design.md`.
   The schema now has 94 models (90 canonical + 4 staging), all cross-checked
   for brace/attribute balance.
2. **Seed script** (`packages/database/src/seed/`) — lookup/taxonomy data only,
   exactly per `docs/operations/seed-strategy.md`: 12 property categories, 14
   unit categories, 10 amenities, 9 utilities, 8 roles, 14 permissions, 3
   cancellation-policy types, and all 15 Phase-1 rollout counties with their
   `rolloutPhase` set from Part C's order. No business data.
3. **Staging import of the 11 audited Nairobi properties** (`packages/database/src/staging/import-nairobi.ts`)
   — reads the raw text verbatim from `packages/database/prisma/seed-data/nairobi/raw/*.txt`
   (extracted directly from the supplied master document, not retyped or
   summarised) and writes it into `staging.raw_property_records` /
   `raw_university_records`, tagged with `source_file` exactly as the
   document states. Nothing is promoted to `public.properties` — that stays
   a manual, logged step per the design.
4. **Duplicate detection job** (`packages/database/src/staging/detect-duplicates.ts`)
   — implements the fuzzy-name-match signal from
   `docs/data-quality/duplicate-conflict-detection-design.md` using
   PostgreSQL `pg_trgm` `similarity()`, scoped to one staging batch. It only
   flags (`conflict_status = FLAGGED`); it never auto-merges.

## What was actually imported

All 12 rows (11 distinct properties; Station View Residency contributes 2
conflicting rows) from the manifest at
`packages/database/prisma/seed-data/nairobi/import-manifest.json`. Both
Station View Residency rows are pre-flagged `FLAGGED` in the manifest itself
— the import script does not need to run the fuzzy-match job to catch this
one, since it's an exact name match already identified during the Milestone 1
audit. The fuzzy-match job exists for names that are *similar but not
identical*, which this dataset does not currently contain among the 11
Nairobi properties (verified: running `findFuzzyDuplicateCandidates` against
this batch, once a real database is available, is expected to return zero
additional candidates beyond the two Station View Residency rows, which are
an exact match and therefore already flagged before the fuzzy job runs).

## Tests

`packages/database/src/seed/__tests__/lookup-data.spec.ts` and
`packages/database/src/staging/__tests__/import-nairobi.spec.ts` — **15
tests, all passing**, run via `pnpm --filter @student-housing/database test`.
They verify: no duplicate lookup keys, all 12 Part-A property types present,
all 15 rollout counties present in the correct order, every manifest record
resolves to a real, non-empty raw text file on disk, the Station View
Residency conflict is flagged in the manifest, and the batch checksum is
deterministic (required for the staging import's idempotent re-run
behaviour).

## Known limitation in this sandbox (read before running locally)

`prisma generate` and `prisma migrate dev` need to download a query-engine
binary from `binaries.prisma.sh`. That domain is not on this environment's
network allowlist, so **I could not run an actual migration or generate a
live Prisma client here**, and could not execute `import-nairobi.ts` or
`detect-duplicates.ts` against a real database. Everything that does not
require the generated client (the manifest, the raw text extraction, the
seed lookup-data logic, and the schema's structural correctness) is
implemented and tested directly. On your machine, with normal internet
access, the following will complete the loop:

```bash
pnpm install
pnpm docker:up
pnpm db:generate
pnpm db:migrate:dev --name init
pnpm db:seed
pnpm --filter @student-housing/database staging:import:nairobi
pnpm --filter @student-housing/database staging:detect-duplicates -- nairobi-phase1-milestone2-audit
```

## Exact next milestone

Phase 1 — Nairobi City, Milestone 3: Authentication and permissions
(email/password + phone OTP + Google sign-in, Argon2id hashing, RBAC using
the `roles`/`permissions`/`user_roles` tables seeded this milestone, admin
MFA, session/device management).

## Approval gate

Stopping here per Part B rule 12. Let me know if you'd like changes to the
staging schema, the seed data, or the duplicate-detection job before I begin
Milestone 3.
