# Uasin Gishu Institution Verification Register

**Phase:** 1 — Uasin Gishu County (Part C rollout phase 10)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`.

## Extraction note

This is one of the few cases where the GPS/campus block was found via the
usual bleed mechanism attached to a *different* county's file (it surfaced
while trimming Kiambu's Kikuyu Ridge Heights record — see
`docs/data-quality/raw-text-bleed-addendum.md`), rather than near its own
section. Same caveat applies: recorded, not trusted.

## Register

| # | University (as supplied) | Property linked to it | Source file (as tagged) | Verification action required |
|---|---|---|---|---|
| 1 | Moi University | Pioneer Academic Residency | Pasted markdown (7).md | Confirm CUE accreditation. GPS (0.5142, 35.2694), Campus "Town Campus / Eldoret Town Core" found via the bleed mechanism — re-extract from the original source file to confirm before use. Note Moi University's well-known main campus is at Kesses, outside Eldoret town — confirm whether "Town Campus" is a genuine, distinct satellite campus |

## Acceptance criteria (Phase 1 gate, Uasin Gishu)

- [ ] Institution cross-checked against the CUE public register
- [ ] "Town Campus / Eldoret Town Core" confirmed as a genuine Moi
      University campus, distinct from the main Kesses campus
- [ ] GPS coordinate re-extracted from the original source file and
      confirmed via a maps-service geocode
