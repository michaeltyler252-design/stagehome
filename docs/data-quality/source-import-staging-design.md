# Source-Data Import Staging Design

**Milestone:** Phase 1, Milestone 1 — Project Foundation
**Purpose:** Define how Part O's consolidated source-supplied property dataset
enters the system without ever reaching a public-facing table unverified.

## Why a staging layer is required

Part B rule 8 forbids exposing source-supplied listings publicly before
verification. Part C requires importing out-of-rollout counties into a
private staging dataset without launching them early. A single-table import
straight into `properties` would make both rules impossible to enforce
consistently, so import happens in two layers.

## Layer 1 — Raw staging (append-only, never read by public API)

A dedicated staging schema (`staging`, separate PostgreSQL schema from
`public`) holds each source file's content close to as-supplied:

```text
staging.raw_import_batches     — one row per import run (file manifest, checksum, imported_by, imported_at)
staging.raw_property_records   — one row per property block, JSON payload, source_file, source_record_reference
staging.raw_university_records — one row per university/campus block, JSON payload
staging.raw_field_issues       — one row per detected gap/inconsistency during parsing (e.g. "Information Required" markers, truncated blocks)
```

Nothing in `staging.*` is ever queried by `apps/web` or exposed through any
public API route. Only the admin data-quality tooling (Part K — Administrator
dashboard: "data-quality queue", "conflict resolution", "source lineage") and
internal ETL jobs read from it.

## Layer 2 — Canonical tables (the Part F model already migrated in this repo)

Promotion from `staging.*` into the canonical tables (`counties`, `universities`,
`campuses`, `properties`, `units`, …) happens only through an explicit,
logged promotion step that:

1. Resolves the property/university to a canonical row (create new, or attach
   to an existing one if a fuzzy match is confirmed — see the companion
   duplicate/conflict detection design).
2. Writes `source_status = SOURCE_SUPPLIED`, `verification_status = UNVERIFIED`,
   `publication_status = DRAFT`, plus `source_file` / `source_record_reference`
   copied from the staging row.
3. Creates a `source_records` row and a `verification_events` row
   (`previous_status: null → new_status: UNVERIFIED`) so the promotion itself
   is auditable, per Part B rule 18.
4. Never sets `publication_status` beyond `DRAFT` — that transition is a manual
   administrator action gated by the verification workflow (Part I).

## County rollout enforcement

`counties.rollout_phase` (already in the Prisma schema) records each county's
approved phase number. A property whose county has no approved
`rollout_phase` yet (or a `rollout_phase` greater than the currently active
phase) can be promoted into the canonical tables for data-quality work, but
the promotion step forces `publication_status = DRAFT`, and an application-layer
check blocks any transition to `PUBLISHED` until the county's phase is active.
This is how "import into staging but do not launch before the approved phase"
(Part C) is enforced technically, not just by convention.

## Nairobi-specific plan for this milestone

Milestone 1 does not populate `staging.*` yet — that begins in Milestone 2
("Database and seed data"), once this design and the verification registers
are approved. The 11 Nairobi university/property pairs identified in the
verification registers are the exact scope for that first staging run.

## Idempotency and re-import safety

Each `raw_import_batches` row stores a checksum of the source file. Re-running
an import of an unchanged file is a no-op (detected by checksum match).
Re-running an import of a changed file creates a new batch and a new set of
`raw_property_records`, leaving the old batch's rows intact for audit — raw
staging is append-only and is never overwritten in place.
