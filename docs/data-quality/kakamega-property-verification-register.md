# Kakamega Property Verification Register

**Phase:** 1 — Kakamega County (Part C rollout phase 11)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`.

## Register

| # | Property (as supplied) | Linked university | Import status | Known data-completeness issue |
|---|---|---|---|---|
| 1 | Kakamega Boulevard Apartments | Masinde Muliro University of Science and Technology (MMUST) | SOURCE_SUPPLIED_UNVERIFIED | None flagged — complete record, cleanly bounded at a genuine Images/Street View ending. The trailing bleed into "VIHIGA" county content was trimmed mid-line at the reliable "Street View: Not Available" anchor, same method used since Embu's audit |

## Standing validation warnings (same as every other county's register)

Do not assume any manager/contact/rating is authentic, do not assume the
listed institution/campus is currently accredited, do not publish Crime
Rating/Flood Risk claims without a documented methodology, treat distances
as estimates until recalculated, treat "Hidden Fees: None" as unverified,
treat availability as expired until reconfirmed.

## Acceptance criteria (Phase 1 gate, Kakamega)

- [ ] Manager contact independently confirmed reachable
- [ ] GPS pair obtained from an independent source (none exists in this
      document at all — see institution register)
- [ ] No property from this register reaches `PUBLISHED` status without a
      corresponding `VerificationEvent` row recording method and evidence
