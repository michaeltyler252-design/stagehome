# Nairobi Property Verification Register

**Phase:** 1 — Nairobi City
**Milestone:** 1 — Project foundation, source-data audit, Nairobi verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`. Per Part B rule 8, none of
these listings may be exposed publicly until verification is complete, and per
rule 9, none of their ratings/reviews may be presented as verified customer
reviews.

## Register

| # | Property (as supplied) | Linked university | Import status | Known data-completeness issue |
|---|---|---|---|---|
| 1 | Karen Village Suites | Africa International University (AIU) | SOURCE_SUPPLIED_UNVERIFIED | Google Maps Link marked "Not Available" in source; booking fee marked "Not Available" |
| 2 | Bogani Premium Apartments | Catholic University of Eastern Africa (CUEA) | SOURCE_SUPPLIED_UNVERIFIED | None flagged beyond standard fields |
| 3 | Karen Ridge Student Residency | Cooperative University of Kenya | SOURCE_SUPPLIED_UNVERIFIED | None flagged beyond standard fields |
| 4 | Kilimani Premium Studios | Daystar University (Nairobi Campus) | SOURCE_SUPPLIED_UNVERIFIED | None flagged beyond standard fields |
| 5 | Ruaraka Avenue Apartments | KCA University | SOURCE_SUPPLIED_UNVERIFIED | None flagged beyond standard fields |
| 6 | Haile Selassie Executive Studios | Kenyatta University (City Campus) | SOURCE_SUPPLIED_UNVERIFIED | Source file differs from the majority (`Pasted markdown (11).md`) — treat as separately sourced |
| 7 | **Station View Residency** | Technical University of Kenya (TUK) | SOURCE_SUPPLIED_UNVERIFIED — **`conflict_status: FLAGGED`** | **Duplicate property.** Appears twice under the same TUK heading: one truncated record (property information cuts off after the opening line, no source-file tag captured) and one fuller record tagged `Pasted markdown (11).md`. This matches the master document's own quality-control note that "Station View Residency: amenities and later sections are incomplete in the source" — but the master document's dedup list (MksU View Apartments, Kwa Vonza Heights, Kimathi Pinnacle Hostels, KarU Plaza Residencies, Kutus Boulevard Apartments, Kibu Boulevard Apartments, Alupe Vista Apartments) does **not** include Station View Residency. It was not deduplicated upstream. **Do not import until a human resolves which record (or a merge of both) is canonical.** |
| 8 | Parklands Academic Suites | Mount Kenya University (MKU — Parklands Campus) | SOURCE_SUPPLIED_UNVERIFIED | None flagged beyond standard fields |
| 9 | Madaraka Executive Suites | Strathmore University | SOURCE_SUPPLIED_UNVERIFIED | None flagged beyond standard fields |
| 10 | Roysambu Luxury Studios | USIU-Africa | SOURCE_SUPPLIED_UNVERIFIED | None flagged beyond standard fields |
| 11 | Central Plaza Apartments | University of Nairobi (UoN) | SOURCE_SUPPLIED_UNVERIFIED | Source file differs from the majority (`Pasted markdown (3)(1).md`) — treat as separately sourced |

## Standing validation warnings that apply to every row above (per Part O)

These apply regardless of how complete an individual record looks:

- Do not assume a named property, manager, phone number, email, rating,
  vacancy count, or review is authentic.
- Do not publish "Crime Rating" or "Flood Risk" claims (several records include
  these) without a documented methodology and a recent, named source.
- Treat every distance/travel-time figure as an estimate until recalculated
  through a maps service (Part H).
- Treat every "Hidden Fees: None" statement as an unverified commercial claim,
  not a guarantee.
- Treat every availability figure as expired until reconfirmed with the
  manager (`verification_status: EXPIRED` is the correct default — see the
  `AvailabilityPeriod` model in the Prisma schema).

## Acceptance criteria for this register (Phase 1 gate)

- [ ] Station View Residency conflict resolved (merge, replace, or reject one
      record) before Technical University of Kenya's inventory is imported
- [ ] Every property's manager contact independently confirmed reachable
      before any `publication_status` moves past `DRAFT`
- [ ] Every property's GPS pair confirmed via maps-service geocode (see
      institution register's extraction note — coordinates in this document
      are not reliable enough to import verbatim)
- [ ] No property from this register reaches `PUBLISHED` status without a
      corresponding `VerificationEvent` row recording method and evidence
