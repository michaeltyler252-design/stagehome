# Kiambu Institution Verification Register

**Phase:** 1 — Kiambu County (Part C rollout phase 2)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`. Nothing in this
register may be published until independently verified per Part B, rules 4
and 8 — identical standard to Nairobi's register.

## Extraction note (same caveat as Nairobi's register, confirmed again here)

The master document's mixed heading/running-text formatting artifact,
documented in `nairobi-institution-verification-register.md`, is present in
Kiambu's section too: Zetech University's `University Name`/`Campus`/`GPS`
text was found attached to the tail of an unrelated Nairobi/Karen property
block roughly 1,300 lines away from Kiambu's own section, not adjacent to
its own heading. The three university/property name pairs below (from
consistently ordered `###`/`####` headings) are reliable; the GPS pair found
for Zetech is recorded but should be re-confirmed independently before use,
exactly like Nairobi's coordinates were.

## Register

| # | University (as supplied) | Property linked to it | Source file (as tagged) | Verification action required |
|---|---|---|---|---|
| 1 | Jomo Kenyatta University of Agriculture and Technology (JKUAT) | Oasis Student Heights | Pasted markdown (3)(1).md | Confirm CUE accreditation (JKUAT is a well-established public university, but campus/GPS for this specific property were not found attached anywhere in the source — treat as `Verification Required`) |
| 2 | Presbyterian University of East Africa (PUEA) | Kikuyu Ridge Heights | Pasted markdown (7).md | Confirm CUE accreditation; no GPS/campus text was found for this pairing in the source at all |
| 3 | Zetech University | Juja Academic Heights | Pasted text (12).txt | Confirm CUE accreditation. A GPS pair and "Main Campus (Juja)" were found nearby in the source, but attached via the same unreliable extraction artifact as Nairobi's coordinates — re-extract from the original source file rather than trusting this document's positioning |

## Acceptance criteria for this register (Phase 1 gate, Kiambu)

- [ ] All 3 institutions cross-checked against the CUE public register
- [ ] Campus names resolved to each institution's own official campus list
- [ ] GPS coordinates re-extracted from original source files and confirmed
      via a maps-service geocode, per Part H — none from this register
      should be imported verbatim
