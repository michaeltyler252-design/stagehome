# Kisumu Property Verification Register

**Phase:** 1 — Kisumu County (Part C rollout phase 5)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`.

## Register

| # | Property (as supplied) | Linked university | Import status | Known data-completeness issue |
|---|---|---|---|---|
| 1 | Kibos Academic Suites | Great Lakes University of Kisumu | SOURCE_SUPPLIED_UNVERIFIED | None flagged beyond standard fields |
| 2 | Milimani View Residency | Kisii University – Kisumu Campus | SOURCE_SUPPLIED_UNVERIFIED | Institution name references Kisii; property is in Kisumu (see institution register) — not a data conflict, a naming clarity note |
| 3 | Lakeside Academic Plaza | Maseno University – Kisumu Campus | SOURCE_SUPPLIED_UNVERIFIED | None flagged beyond standard fields |

## Standing validation warnings (same as every other county's register)

Do not assume any manager/contact/rating is authentic, do not assume the
listed institution/campus is currently accredited, do not publish Crime
Rating/Flood Risk claims without a documented methodology, treat distances
as estimates until recalculated, treat "Hidden Fees: None" as unverified,
treat availability as expired until reconfirmed.

## Acceptance criteria (Phase 1 gate, Kisumu)

- [ ] Every property's manager contact independently confirmed reachable
- [ ] Every property's GPS pair confirmed via maps-service geocode
- [ ] No property from this register reaches `PUBLISHED` status without a
      corresponding `VerificationEvent` row recording method and evidence
