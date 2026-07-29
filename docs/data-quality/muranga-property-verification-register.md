# Murang'a Property Verification Register

**Phase:** 1 — Murang'a County (Part C rollout phase 15)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`.

## Register

| # | Property (as supplied) | Linked university | Import status | Known data-completeness issue |
|---|---|---|---|---|
| 1 | Pioneer Plaza View | Murang'a University of Technology (MUT) | SOURCE_SUPPLIED_UNVERIFIED | None — this is a complete record (all sections present: pricing, accommodation types, utilities, security, amenities, nearby places, tenancy rules, contact details, availability, reviews, images) |

## Standing validation warnings (same as every other county's register)

Do not assume the manager ("Pioneer Plaza Property Trust") or its contact
details are authentic. Do not assume Murang'a University of Technology's
accreditation status. Do not publish the "Crime Rating: Low" / "Flood Risk:
Low" claims without a documented methodology. Treat the 0.6 km / 8-minute
walking distance as an estimate until recalculated via a maps service.
Treat "Hidden Fees: None" as an unverified commercial claim. Treat the
listed availability (5 bedsitters, 2 studios) as expired until reconfirmed
with the manager directly.

## Acceptance criteria (Phase 1 gate, Murang'a)

- [ ] Manager contact independently confirmed reachable
- [ ] GPS pair confirmed via maps-service geocode
- [ ] No property from this register reaches `PUBLISHED` status without a
      corresponding `VerificationEvent` row recording method and evidence
