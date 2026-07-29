# Kisii Property Verification Register

**Phase:** 1 — Kisii County (Part C rollout phase 12)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`.

## Register

| # | Property (as supplied) | Linked university | Import status | Known data-completeness issue |
|---|---|---|---|---|
| 1 | Nyabururu Academic Residency | Kisii University | SOURCE_SUPPLIED_UNVERIFIED — **incomplete record** | The source text cuts off mid-Amenities section. Missing entirely: rest of Amenities, Nearby Places, Tenancy Rules, **Contact Details**, Availability, Reviews, Images. No rent-adjacent commercial claims (booking fee, hidden fees) can be evaluated since even the data present stops short of anything past Amenities. This is the only county register so far missing Contact Details completely — every other property, however incomplete otherwise, has at least a phone number. |

## Standing validation warnings (same as every other county's register, where applicable)

Do not assume Kisii University's accreditation status. Do not publish the
"Crime Rating: Low" / "Flood Risk: Minimal" claims without a documented
methodology. Treat the 0.8 km / 10-minute walking distance as an estimate
until recalculated via a maps service. **This property cannot proceed to
manager-contact verification at all until contact details are supplied —
there is nothing to call.**

## Acceptance criteria (Phase 1 gate, Kisii)

- [ ] The missing back-half of this record (at minimum, contact details)
      is supplied
- [ ] GPS pair confirmed via maps-service geocode
- [ ] Manager contact independently confirmed reachable (blocked until the
      above is resolved)
- [ ] No property from this register reaches `PUBLISHED` status without a
      corresponding `VerificationEvent` row recording method and evidence
