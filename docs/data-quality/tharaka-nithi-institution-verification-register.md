# Tharaka-Nithi Institution Verification Register

**Phase:** 1 — Tharaka-Nithi County (Part C rollout phase 8)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`.

## Extraction note

Same bleed-attachment artifact as every prior county. This time the
University Information block was found in an unusual spot: attached
directly after a truncated repeat of this county's own heading
("---## THARAKA-NITHI COUNTY### Chuka University#### Almark Hostels"),
appearing roughly 3,600 lines away, right before the Homa Bay County
section. Recorded, not trusted, same standard as always.

## Register

| # | University (as supplied) | Property linked to it | Source file (as tagged) | Verification action required |
|---|---|---|---|---|
| 1 | Chuka University | Almark Hostels | Pasted markdown (2)(1).md | Confirm CUE accreditation. GPS (-0.3292, 37.6444), Campus "Main Campus (Ndagani)", Town "Chuka" found via the bleed mechanism described above — re-extract from the original source file to confirm before use |

## Acceptance criteria (Phase 1 gate, Tharaka-Nithi)

- [ ] Institution cross-checked against the CUE public register
- [ ] Campus name and GPS coordinate re-extracted from the original source
      file and confirmed via a maps-service geocode
