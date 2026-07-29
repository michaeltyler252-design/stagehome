# Nairobi Institution Verification Register

**Phase:** 1 — Nairobi City
**Milestone:** 1 — Project foundation, source-data audit, Nairobi verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`. Nothing in this register may be
published until independently verified per Part B, rules 4 and 8.

## Extraction note (read first)

The supplied master document mixes two representations of the same Nairobi
property records: a heading-marked outline (`### University`, `#### Property`)
and, later in the same file, a second running-text restatement of University
Name / Campus / GPS fields for what appears to be the same property, without
heading markup. In at least one property block, this results in a University
Information paragraph appearing to describe the *next* property before that
property's own heading is reached. Automated field-level extraction (exact
GPS pairs, exact campus name) from this consolidated PDF is therefore
**not reliable enough to seed a database from directly**. The 11
university/property pairs (the identifying names) are reliable — they come
from consistently ordered `###`/`####` headings — but coordinate and campus
fields must be re-extracted from the original per-property source files
(`Pasted text (12).txt`, `Pasted markdown (11).md`, `Pasted markdown (3)(1).md`)
during Milestone 2, not carried forward from this register as-is.

## Register

| # | University (as supplied) | Property linked to it | Source file (as tagged) | Verification action required |
|---|---|---|---|---|
| 1 | Africa International University (AIU) | Karen Village Suites | Pasted text (12).txt | Confirm accreditation via the Commission for University Education (CUE) public register; re-extract campus GPS from original source file |
| 2 | Catholic University of Eastern Africa (CUEA) | Bogani Premium Apartments | Pasted text (12).txt | Confirm CUE accreditation; re-extract campus GPS |
| 3 | Cooperative University of Kenya | Karen Ridge Student Residency | Pasted text (12).txt | Confirm CUE accreditation; confirm campus address |
| 4 | Daystar University (Nairobi Campus) | Kilimani Premium Studios | Pasted text (12).txt | Confirm CUE accreditation; "Nairobi Campus" is not one of Daystar's well-known public campus names (Athi River, Valley Road) — confirm which campus this actually refers to |
| 5 | KCA University | Ruaraka Avenue Apartments | Pasted text (12).txt | Confirm CUE accreditation; confirm current Ruaraka campus address |
| 6 | Kenyatta University (City Campus) | Haile Selassie Executive Studios | Pasted markdown (11).md | Confirm CUE accreditation; confirm "City Campus" is a currently operating KU campus distinct from the main Kahawa campus |
| 7 | Technical University of Kenya (TUK) | Station View Residency | Two source blocks under the same heading — see Property Register conflict note below | Confirm CUE accreditation; resolve the duplicate property record before using any of its fields |
| 8 | Mount Kenya University (MKU — Parklands Campus) | Parklands Academic Suites | Pasted text (12).txt | Confirm CUE accreditation; confirm current Parklands campus address |
| 9 | Strathmore University | Madaraka Executive Suites | Pasted text (12).txt | Confirm CUE accreditation; confirm Madaraka campus address |
| 10 | USIU-Africa | Roysambu Luxury Studios | Pasted text (12).txt | Confirm CUE accreditation; USIU-Africa's well-known campus sits on the Thika Road/Kasarani corridor — confirm "Roysambu" naming against the institution's own materials |
| 11 | University of Nairobi (UoN) | Central Plaza Apartments | Pasted markdown (3)(1).md | Confirm CUE accreditation; UoN operates several Nairobi-area campuses (Main, Kikuyu, Parklands, Chiromo, Lower Kabete) — "Nairobi Campus" alone is not sufficient to identify which one |

## Acceptance criteria for this register (Phase 1 gate)

- [ ] All 11 institutions cross-checked against the CUE public register
- [ ] All 11 campus names resolved to an institution's own official campus list,
      or explicitly retained as `Verification Required` with a documented reason
- [ ] All GPS coordinates re-extracted from original source files (not this PDF)
      and confirmed via a maps-service geocode, per Part H
- [ ] Technical University of Kenya (TUK) duplicate record resolved (see property
      register) before TUK is marked verified
