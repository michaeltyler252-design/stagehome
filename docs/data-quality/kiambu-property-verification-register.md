# Kiambu Property Verification Register

**Phase:** 1 — Kiambu County (Part C rollout phase 2)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`. Per Part B rule 8,
none of these listings may be exposed publicly until verification is
complete.

## Register

| # | Property (as supplied) | Linked university | Import status | Known data-completeness issue |
|---|---|---|---|---|
| 1 | Oasis Student Heights | JKUAT | SOURCE_SUPPLIED_UNVERIFIED | None flagged beyond standard fields |
| 2 | Kikuyu Ridge Heights | Presbyterian University of East Africa (PUEA) | SOURCE_SUPPLIED_UNVERIFIED | None flagged beyond standard fields |
| 3 | **Juja Academic Heights** | Zetech University | SOURCE_SUPPLIED_UNVERIFIED — **incomplete record** | The master document's own quality-control register explicitly flags this one: *"the source ends after distance details."* Monthly Rent, Deposit, Amenities, Contact Details, Availability, and Images are all marked `Information Required` **in the source itself** — this platform did not discover the gap, the document declared it. No conflict/duplicate issue (unlike Station View Residency in Nairobi) — just genuinely incomplete, and must stay `Information Required` rather than have any of those fields guessed. |

## Standing validation warnings (same as Nairobi's register, per Part O)

Identical warnings apply: do not assume any manager/contact/rating is
authentic, do not assume the listed institution/campus is currently
accredited, do not publish Crime Rating/Flood Risk claims without a
documented methodology, treat distances as estimates until recalculated,
treat "Hidden Fees: None" as unverified, treat availability as expired
until reconfirmed.

## Acceptance criteria for this register (Phase 1 gate, Kiambu)

- [ ] Every property's manager contact independently confirmed reachable
      before any `publication_status` moves past `DRAFT`
- [ ] Every property's GPS pair confirmed via maps-service geocode
- [ ] Juja Academic Heights' `Information Required` fields are filled in
      through direct manager contact, not inference, before this listing
      can be approved — an incomplete record is not itself disqualifying,
      but publishing it with guessed rent/amenities would violate Part B
      rule 4
- [ ] No property from this register reaches `PUBLISHED` status without a
      corresponding `VerificationEvent` row recording method and evidence
