# Nyeri Property Verification Register

**Phase:** 1 — Nyeri County (Part C rollout phase 13)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`.

## Register

| # | Property (as supplied) | Linked university | Import status | Known data-completeness issue |
|---|---|---|---|---|
| 1 | Kimathi Pinnacle Hostels | Dedan Kimathi University of Technology (DeKUT) | SOURCE_SUPPLIED_UNVERIFIED | Property name appears in the source document's own dedup register — this is the canonical, already-consolidated version, not a new duplicate |
| 2 | KarU Plaza Residencies | Karatina University | SOURCE_SUPPLIED_UNVERIFIED | Property name appears in the source document's own dedup register — this is the canonical, already-consolidated version, not a new duplicate |

**Not included in this register:** Bondo Central Residencies (nested under
Nyeri's heading in the source, but its own address places it in Siaya
County — see the institution register's finding).

## Standing validation warnings (same as every other county's register)

Do not assume any manager/contact/rating is authentic, do not assume the
listed institution/campus is currently accredited, do not publish Crime
Rating/Flood Risk claims without a documented methodology, treat distances
as estimates until recalculated, treat "Hidden Fees: None" as unverified,
treat availability as expired until reconfirmed.

## Acceptance criteria (Phase 1 gate, Nyeri)

- [ ] Both properties' manager contacts independently confirmed reachable
- [ ] Both GPS pairs confirmed via maps-service geocode / independent source
- [ ] No property from this register reaches `PUBLISHED` status without a
      corresponding `VerificationEvent` row recording method and evidence
