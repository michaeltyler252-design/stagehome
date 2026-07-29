# Kirinyaga Institution Verification Register

**Phase:** 1 — Kirinyaga County (Part C rollout phase 14)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`.

## Extraction note

Same bleed-attachment artifact as every prior county. The GPS/campus block
was found attached to a truncated repeat of this county's own heading,
~2,900 lines away, near a Kisumu County boundary. Recorded, not trusted,
same standard as always.

## Register

| # | University (as supplied) | Property linked to it | Source file (as tagged) | Verification action required |
|---|---|---|---|---|
| 1 | Kirinyaga University (KyU) | Kutus Boulevard Apartments | Pasted text(154).txt | Confirm CUE accreditation. GPS (-0.4952, 37.3241), Campus "Main Campus (Kutus)", Town "Kutus" found via the bleed mechanism described above — re-extract from the original source file to confirm before use |

## Acceptance criteria (Phase 1 gate, Kirinyaga)

- [ ] Institution cross-checked against the CUE public register
- [ ] Campus name and GPS coordinate re-extracted from the original source
      file and confirmed via a maps-service geocode
