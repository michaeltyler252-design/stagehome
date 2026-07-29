# Machakos Property Verification Register

**Phase:** 1 — Machakos County (Part C rollout phase 9)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`.

## Register

| # | Property (as supplied) | Linked university | Import status | Known data-completeness issue |
|---|---|---|---|---|
| 1 | MksU View Apartments | Machakos University (MksU) | SOURCE_SUPPLIED_UNVERIFIED | None beyond standard fields. Note: this property name appears in the master document's own dedup register (repeated records consolidated by name prior to this audit) — the record here is already the canonical version, not a new duplicate |

## Standing validation warnings (same as every other county's register)

Do not assume any manager/contact/rating is authentic, do not assume the
listed institution/campus is currently accredited, do not publish Crime
Rating/Flood Risk claims without a documented methodology, treat distances
as estimates until recalculated, treat "Hidden Fees: None" as unverified,
treat availability as expired until reconfirmed.

## Acceptance criteria (Phase 1 gate, Machakos)

- [ ] Manager contact independently confirmed reachable
- [ ] GPS pair obtained from an independent source (none exists in this
      document at all — see institution register)
- [ ] No property from this register reaches `PUBLISHED` status without a
      corresponding `VerificationEvent` row recording method and evidence
