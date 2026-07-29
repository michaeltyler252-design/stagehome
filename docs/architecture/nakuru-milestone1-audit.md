# Phase 1 — Nakuru County (Rollout Phase 3) — Milestone 1: Source-Data Audit

## What was audited

Read Part O's Nakuru County section in full. **Exactly 1 university, 1
property** — the smallest county audited so far.

- Egerton University (Njoro) → Njoro Boulevard Apartments

## A self-correction worth disclosing

While extracting this section, my first pass used line numbers from an
earlier tool call that turned out to be wrong — I caught the mismatch by
cross-checking with a direct `grep -n` before writing anything to the repo,
re-extracted with the correct (grep-verified) boundaries, and confirmed the
result was clean (starts exactly at the property heading, ends exactly
before the next county's heading). Flagging this because the discipline of
"verify against a second, independent method before trusting a number" is
exactly what prevented a wrong 190-line extraction from silently entering
the dataset.

## Data quality

Njoro Boulevard Apartments is, notably, **the most complete single record
audited across all three counties so far** — full rent/pricing, utilities,
security, amenities, tenancy rules, contact details, availability, and
reviews sections are all present, unlike Kiambu's Zetech record (explicitly
incomplete per the source) or Nairobi's Station View Residency (duplicated).
No conflict, no incompleteness flag needed for this one.

A GPS/campus block for "Egerton University (Njoro)" was found via the same
bleed-attachment artifact as the other counties' registers, but the
university name match is exact, giving it somewhat more (still unconfirmed)
credibility than Kiambu's Zetech case.

## Tests

**30 database-package tests passing** (up from 23 — Nakuru added to the
parameterised multi-county suite plus its own specific assertions).
Typecheck clean. No code changes were needed beyond the county-specific
data files — `import-county.ts`'s generalisation from Kiambu's Milestone 1
handled Nakuru with only a new manifest, raw text file, and a 6-line
wrapper script.

## Status

Same as Kiambu: structurally ready the moment a human decides to advance
`CURRENT_ACTIVE_ROLLOUT_PHASE` and Njoro Boulevard Apartments clears
verification. Not touching that constant — same reasoning as Kiambu's
readiness report.

## Approval gate

Stopping here per Part B rule 12.

---

## Update — 2026-07-27: approval received, phase advanced to 3

`CURRENT_ACTIVE_ROLLOUT_PHASE` has been advanced from `2` to `3` following
explicit approval. `VerificationService.publish()` will now accept Nakuru
properties (`rolloutPhase: 3`) once they clear `APPROVED` status. **This
does not mean Njoro Boulevard Apartments is live** — it hasn't been through
real verification (see `docs/data-quality/nakuru-institution-verification-register.md`
and `nakuru-property-verification-register.md` for the specific outstanding
items), and no staging import has ever run against a live database. Mombasa
(phase 4) has zero source data and remains blocked regardless of this
constant — see `docs/data-quality/phase1-rollout-data-availability-audit.md`.
A regression test in `verification.service.spec.ts` ("publishes an
APPROVED property in Nakuru now that phase 3 is active") proves this works
correctly.
