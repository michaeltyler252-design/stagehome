# Kisii Institution Verification Register

**Phase:** 1 — Kisii County (Part C rollout phase 12)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`.

## Important context: this county previously had zero data

`docs/data-quality/phase1-rollout-data-availability-audit.md` originally
found no source records for Kisii anywhere in the master document (the only
"Kisii" text found was "Kisii University – Kisumu Campus," an institution
actually located in Kisumu County, per Kisumu's own register). The user has
since supplied a real record for Kisii itself from a different source
document ("Kenya Premium Rental Marketplace Knowledge Base"). That original
finding is now superseded for Kisii — updated accordingly in the rollout
data-availability audit.

## The record supplied is genuinely incomplete — disclosed, not filled in

The source text itself cuts off mid-sentence inside the Amenities section,
immediately after "Balcony: Select upper floor rooms feature step-out
verandas." Everything that would normally follow — the rest of Amenities
(Wardrobes, Parking, Gym, Swimming Pool, Rooftop, Garden, Study Area),
Nearby Places, Tenancy Rules, Contact Details, Availability, Reviews, and
Images — is simply **absent**, not summarized or guessed at. Per Part B
rule 4, nothing was invented to complete it.

## Register

| # | University (as supplied) | Property linked to it | Source (as tagged) | Verification action required |
|---|---|---|---|---|
| 1 | Kisii University | Nyabururu Academic Residency | Kenya Premium Rental Marketplace Knowledge Base (user-supplied) | Confirm CUE accreditation. GPS (-0.6824, 34.7811), Campus "Main Campus", Town "Kisii" as directly supplied — still requires independent maps-service confirmation. **Also requires the missing back-half of the property record before this listing can be considered for verification at all** — there is currently no contact detail to even attempt manager outreach with |

## Acceptance criteria (Phase 1 gate, Kisii)

- [ ] Institution cross-checked against the CUE public register
- [ ] GPS coordinate confirmed via a maps-service geocode
- [ ] **The missing sections of this record (contact details, in
      particular) must be supplied before any manager-outreach
      verification step is even possible** — this is a hard blocker distinct
      from every other county's checklist, which at minimum has a phone
      number to call
