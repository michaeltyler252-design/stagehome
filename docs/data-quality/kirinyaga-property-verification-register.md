# Kirinyaga Property Verification Register

**Phase:** 1 — Kirinyaga County (Part C rollout phase 14)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`.

## Register

| # | Property (as supplied) | Linked university | Import status | Known data-completeness issue |
|---|---|---|---|---|
| 1 | Kutus Boulevard Apartments | Kirinyaga University (KyU) | SOURCE_SUPPLIED_UNVERIFIED | Property name appears in the source document's own dedup register — this is the canonical, already-consolidated version, not a new duplicate |

## Standing validation warnings (same as every other county's register)

Do not assume any manager/contact/rating is authentic, do not assume the
listed institution/campus is currently accredited, do not publish Crime
Rating/Flood Risk claims without a documented methodology, treat distances
as estimates until recalculated, treat "Hidden Fees: None" as unverified,
treat availability as expired until reconfirmed.

## Acceptance criteria (Phase 1 gate, Kirinyaga)

- [ ] Manager contact independently confirmed reachable
- [ ] GPS pair confirmed via maps-service geocode
- [ ] No property from this register reaches `PUBLISHED` status without a
      corresponding `VerificationEvent` row recording method and evidence
