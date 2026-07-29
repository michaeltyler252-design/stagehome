# Nakuru Institution Verification Register

**Phase:** 1 — Nakuru County (Part C rollout phase 3)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`.

## Extraction note

Nakuru's section contains exactly **1 university, 1 property** — the
smallest so far. A `University Name`/`Campus`/`GPS` block for this exact
university was found via the same bleed-attachment artifact documented in
Nairobi's and Kiambu's registers (this time only ~1,400 lines away, near a
Machakos/Nyeri boundary), but the university name matches exactly
("Egerton University (Njoro)"), which gives more confidence than the
Kiambu/Zetech case — still, treat as unconfirmed until independently
re-verified, per the standing rule.

## Register

| # | University (as supplied) | Property linked to it | Source file (as tagged) | Verification action required |
|---|---|---|---|---|
| 1 | Egerton University (Njoro) | Njoro Boulevard Apartments | Pasted markdown (7).md | Confirm CUE accreditation (Egerton is a well-established public university). A GPS pair (-0.3684, 35.9264) and "Main Campus (Njoro)" were found via the bleed-attachment mechanism — re-extract from the original source file to confirm before use, same standard as every other county's register |

## Acceptance criteria (Phase 1 gate, Nakuru)

- [ ] Institution cross-checked against the CUE public register
- [ ] Campus name resolved to Egerton's own official campus list
  (Egerton has multiple campuses — Njoro, Nakuru Town, Nairobi CBD — confirm
  "Njoro" specifically)
- [ ] GPS coordinate re-extracted from the original source file and
      confirmed via a maps-service geocode
