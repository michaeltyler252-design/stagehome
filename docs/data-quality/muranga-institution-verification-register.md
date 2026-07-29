# Murang'a Institution Verification Register

**Phase:** 1 — Murang'a County (Part C rollout phase 15)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`.

## Important context: this county previously had zero data

`docs/data-quality/phase1-rollout-data-availability-audit.md` originally
found no source records for Murang'a anywhere in the master document. The
user has since supplied a real record from a **different** source document
("Kenya Premium Rental Marketplace Knowledge Base"). That original finding
is now superseded for Murang'a — it applied to the original master document
only, and is updated accordingly in the rollout data-availability audit.

## Extraction note

Unlike every county audited from the original master document, this
record's GPS and campus fields were supplied directly and cleanly in its
own `University Information` section — no bleed-attachment reconstruction
was needed. It is still `SOURCE_SUPPLIED_UNVERIFIED` and still requires the
same independent confirmation as every other county's data; a clean
presentation doesn't make a claim true, it just means there was nothing to
reconstruct.

## Register

| # | University (as supplied) | Property linked to it | Source (as tagged) | Verification action required |
|---|---|---|---|---|
| 1 | Murang'a University of Technology (MUT) | Pioneer Plaza View | Kenya Premium Rental Marketplace Knowledge Base (user-supplied) | Confirm CUE accreditation. GPS (-1.0436, 37.1512), Campus "Main Campus", Town "Murang'a" as directly supplied — still requires independent maps-service confirmation before use, same as every county |

## Acceptance criteria (Phase 1 gate, Murang'a)

- [ ] Institution cross-checked against the CUE public register
- [ ] GPS coordinate confirmed via a maps-service geocode
- [ ] Manager contact ("Pioneer Plaza Property Trust") independently
      confirmed reachable at the supplied phone/WhatsApp/email
