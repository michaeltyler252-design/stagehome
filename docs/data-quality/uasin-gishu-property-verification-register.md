# Uasin Gishu Property Verification Register

**Phase:** 1 — Uasin Gishu County (Part C rollout phase 10)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`.

## Register

| # | Property (as supplied) | Linked university | Import status | Known data-completeness issue |
|---|---|---|---|---|
| 1 | Pioneer Academic Residency | Moi University | SOURCE_SUPPLIED_UNVERIFIED | None flagged — complete record, cleanly bounded at a genuine Images/Street View ending with no trailing bleed |

## Standing validation warnings (same as every other county's register)

Do not assume any manager/contact/rating is authentic, do not assume the
listed institution/campus is currently accredited, do not publish Crime
Rating/Flood Risk claims without a documented methodology, treat distances
as estimates until recalculated, treat "Hidden Fees: None" as unverified,
treat availability as expired until reconfirmed.

## Acceptance criteria (Phase 1 gate, Uasin Gishu)

- [ ] Manager contact independently confirmed reachable
- [ ] GPS pair confirmed via maps-service geocode
- [ ] No property from this register reaches `PUBLISHED` status without a
      corresponding `VerificationEvent` row recording method and evidence
