# Mombasa Institution Verification Register

**Phase:** 1 — Mombasa County (Part C rollout phase 4)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`.

## Important context: this was the last true zero-data county

`docs/data-quality/phase1-rollout-data-availability-audit.md` originally
found zero source records for Mombasa, Kisii, and Murang'a. Murang'a and
Kisii were resolved (partially, in Kisii's case) by a user-supplied source
document. Mombasa has now received a record from the same source. **All
three of the original gap counties have now received at least some real
data** — this specific finding in the rollout audit is fully superseded.

## Extraction note

GPS and campus data were supplied directly and cleanly in this record's own
`University Information` section, same as Murang'a's. Still
`SOURCE_SUPPLIED_UNVERIFIED` — a clean presentation is not the same as a
confirmed fact.

## Register

| # | University (as supplied) | Property linked to it | Source (as tagged) | Verification action required |
|---|---|---|---|---|
| 1 | Technical University of Mombasa (TUM) | Tudor Crest Apartments | Kenya Premium Rental Marketplace Knowledge Base (user-supplied) | Confirm CUE accreditation. GPS (-4.0394, 39.6641), Campus "Main Campus (Tudor)", Town "Mombasa" as directly supplied — still requires independent maps-service confirmation before use, same as every county |

## Acceptance criteria (Phase 1 gate, Mombasa)

- [ ] Institution cross-checked against the CUE public register
- [ ] GPS coordinate confirmed via a maps-service geocode
- [ ] Manager contact ("Tudor Crest Realty Management") independently
      confirmed reachable at the supplied phone/WhatsApp/email
