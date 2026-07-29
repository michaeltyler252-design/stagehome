# Mombasa Property Verification Register

**Phase:** 1 — Mombasa County (Part C rollout phase 4)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`.

## Register

| # | Property (as supplied) | Linked university | Import status | Known data-completeness issue |
|---|---|---|---|---|
| 1 | Tudor Crest Apartments | Technical University of Mombasa (TUM) | SOURCE_SUPPLIED_UNVERIFIED | None — this is a complete record (all sections present: pricing, accommodation types, utilities, security, amenities, nearby places, tenancy rules, contact details, availability, reviews, images) |

## Standing validation warnings (same as every other county's register)

Do not assume the manager ("Tudor Crest Realty Management") or its contact
details are authentic. Do not assume Technical University of Mombasa's
accreditation status. Do not publish the "Crime Rating: Low to Medium" /
"Flood Risk: None" claims without a documented methodology. Treat the
0.7 km / 9-minute walking distance as an estimate until recalculated via a
maps service. Treat "Hidden Fees: None" as an unverified commercial claim.
Treat the listed availability (3 bedsitters, 1 studio) as expired until
reconfirmed with the manager directly.

## Acceptance criteria (Phase 1 gate, Mombasa)

- [ ] Manager contact independently confirmed reachable
- [ ] GPS pair confirmed via maps-service geocode
- [ ] No property from this register reaches `PUBLISHED` status without a
      corresponding `VerificationEvent` row recording method and evidence
