# Machakos Institution Verification Register

**Phase:** 1 — Machakos County (Part C rollout phase 9)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`.

## Extraction note

No GPS/campus bleed-through text was found anywhere in the document for
Machakos University — same situation as Embu's register. Recorded as fully
`Verification Required` rather than populated with a guessed value.

This property's name ("MksU View Apartments") is one the master document's
own quality-control register lists as having been consolidated from
repeated records during the source document's own dedup pass, before this
platform's audit began. This is a data-hygiene note, not a conflict this
platform needs to resolve — the record here is already the canonical one.

## Register

| # | University (as supplied) | Property linked to it | Source file (as tagged) | Verification action required |
|---|---|---|---|---|
| 1 | Machakos University (MksU) | MksU View Apartments | Pasted markdown (4).md | Confirm CUE accreditation. No GPS or campus text was found anywhere in the source — both fields are `Verification Required` from an independent source |

## Acceptance criteria (Phase 1 gate, Machakos)

- [ ] Institution cross-checked against the CUE public register
- [ ] Campus name and GPS coordinate obtained from an independent source,
      since none exists in this document at all
