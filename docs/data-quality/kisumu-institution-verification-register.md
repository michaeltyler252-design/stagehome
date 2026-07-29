# Kisumu Institution Verification Register

**Phase:** 1 — Kisumu County (Part C rollout phase 5)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`.

## Extraction note

Same bleed-attachment artifact as every prior county's register. All three
GPS/campus blocks below were found via that mechanism, at varying distances
from their own section — recorded, not trusted, same standard throughout.

## Register

| # | University (as supplied) | Property linked to it | Source file (as tagged) | Verification action required |
|---|---|---|---|---|
| 1 | Great Lakes University of Kisumu | Kibos Academic Suites | Pasted text (10).txt | Confirm accreditation via CUE. GPS (-0.0742, 34.8124), Campus "Main Campus (Kibos)" found via bleed mechanism — re-extract before use |
| 2 | Kisii University – Kisumu Campus | Milimani View Residency | Pasted text (10).txt | Confirm accreditation via CUE. **Naming flag:** despite the "Kisii" name, this institution's campus is explicitly located in Kisumu County per its own source text ("County: Kisumu"). Kisii County itself has zero source records anywhere in the master document (see `phase1-rollout-data-availability-audit.md`) — do not let this record be mistaken for Kisii County coverage. GPS (-0.1042, 34.7584), Campus "Kisumu Central Campus" found via bleed mechanism |
| 3 | Maseno University – Kisumu Campus | Lakeside Academic Plaza | Pasted text (10).txt | Confirm accreditation via CUE. GPS (-0.1021, 34.7541), Campus "Kisumu City Campus" found via bleed mechanism — re-extract before use. Note Maseno's main campus is in Kisumu County (Maseno town) itself, so "Kisumu City Campus" should be confirmed as a genuine satellite campus, not a naming error |

## Acceptance criteria (Phase 1 gate, Kisumu)

- [ ] All 3 institutions cross-checked against the CUE public register
- [ ] The Kisii-University-in-Kisumu naming distinction explicitly
      confirmed with whoever manages county-level reporting, so it's never
      miscounted as Kisii County inventory
- [ ] All 3 GPS coordinates re-extracted from original source files and
      confirmed via a maps-service geocode
