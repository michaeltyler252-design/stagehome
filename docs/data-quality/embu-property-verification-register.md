# Embu Property Verification Register

**Phase:** 1 — Embu County (Part C rollout phase 6)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`.

## Register

| # | Property (as supplied) | Linked university | Import status | Known data-completeness issue |
|---|---|---|---|---|
| 1 | Kamiri Plaza Apartments | University of Embu (UoEm) | SOURCE_SUPPLIED_UNVERIFIED | None flagged beyond standard fields; extraction boundary confirmed clean (this county's record ends cleanly at a `---` separator with no trailing bleed from another county, unlike several earlier Nairobi extractions — see `docs/data-quality/raw-text-bleed-addendum.md`) |

## Standing validation warnings (same as every other county's register)

Do not assume any manager/contact/rating is authentic, do not assume the
listed institution/campus is currently accredited, do not publish Crime
Rating/Flood Risk claims without a documented methodology, treat distances
as estimates until recalculated, treat "Hidden Fees: None" as unverified,
treat availability as expired until reconfirmed.

## Acceptance criteria (Phase 1 gate, Embu)

- [ ] Manager contact independently confirmed reachable
- [ ] GPS pair obtained from an independent source (none exists in this
      document at all — see institution register)
- [ ] No property from this register reaches `PUBLISHED` status without a
      corresponding `VerificationEvent` row recording method and evidence
