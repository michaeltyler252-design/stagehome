# Meru Institution Verification Register

**Phase:** 1 — Meru County (Part C rollout phase 7)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`.

## Extraction note

This county's document section actually appears **twice** in the master
document: once as a genuine, complete property record (used here), and
once as a truncated stub (~2,300 lines away, near a Uasin Gishu boundary)
containing only a `University Information` block with no property body.
That stub is where this register's GPS/campus values were actually found —
same bleed-attachment caveat as every other county's register — but in
this case it happened to be the more informative of the two occurrences,
since the genuine record's own University Information text was not
recoverable elsewhere in the document.

## Register

| # | University (as supplied) | Property linked to it | Source file (as tagged) | Verification action required |
|---|---|---|---|---|
| 1 | Meru University of Science and Technology (MUST) | Marimba House Residence | Pasted markdown (2)(1).md | Confirm CUE accreditation. GPS (0.1171, 37.8441), Campus "Main Campus (Nchiru)" found via a truncated duplicate stub elsewhere in the document — re-extract from the original source file to confirm before use |

## Acceptance criteria (Phase 1 gate, Meru)

- [ ] Institution cross-checked against the CUE public register
- [ ] Campus name confirmed against MUST's own official materials
- [ ] GPS coordinate re-extracted from the original source file and
      confirmed via a maps-service geocode
