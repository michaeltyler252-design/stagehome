# New Counties Verification Register — Kitui, Elgeyo Marakwet, Nandi, Baringo, Laikipia, Vihiga, Bungoma, Busia, Siaya, Homa Bay

**Status of every row below:** `SOURCE_SUPPLIED_UNVERIFIED`. All raw text
preserved verbatim from user-supplied source documents — nothing invented.

## Register

| County | University (as supplied) | Property | Completeness |
|---|---|---|---|
| Kitui | South Eastern Kenya University (SEKU) | Kwa Vonza Heights | Complete |
| Elgeyo Marakwet | Tambach Higher Learning Centers / Local College Hubs | Tambach Vista Residences | Complete — but the institution itself is named vaguely, not as one accredited university |
| Nandi | Koitalel Samoei University College / Higher Colleges | Nandi Hills Elite Suites | Complete — institution heading combines two different entity names |
| Baringo | Egerton University - Kabarnet Campus / Local Technical Colleges | Kabarnet Heights Plaza | Complete — institution heading combines two different entity names |
| Laikipia | Laikipia University | Nyahururu Horizon Hub | Complete except no Nearby Places section exists in the source at all |
| Vihiga | Masinde Muliro University of Science and Technology (MMUST) | Ebunangwe Heights Plaza | Complete |
| Vihiga | Kaimosi Friends University | Kaimosi Academic Enclave | Complete |
| Bungoma | Kibabii University (KIBU) | Kibu Boulevard Apartments | Complete |
| Busia | Alupe University (AU) | Alupe Vista Apartments | Complete |
| Siaya | Jaramogi Oginga Odinga University of Science and Technology (JOOUST) | Bondo Central Residencies | Complete — previously encountered nested under Nyeri's heading in an earlier document and correctly excluded from Nyeri at that time; this is the confirmation it genuinely belongs to Siaya |
| Homa Bay | Tom Mboya University | Tom Mboya Academic Heights | Severely incomplete — source cuts off after "Google Maps Link: Not Available." No rent, no accommodation types, no utilities, no security, no amenities, no nearby places, no tenancy rules, no contact details, no availability, no reviews, no images. This is the most incomplete record in the entire project. |

## Institution-identity flags worth a human's attention specifically

Three of these ten institution headings name more than one entity at once,
rather than a single accredited university:
- Elgeyo Marakwet: "Tambach Higher Learning Centers / Local College Hubs"
- Nandi: "Kaimosi Bio-Tech / Koitalel Samoei University College"
- Baringo: "Baringo Technical College / Egerton University - Kabarnet Campus"

These need a human to determine which specific, real, accredited
institution (if any) the property should actually be linked to before
verification can proceed meaningfully — publishing under an ambiguous or
compound institution name would misrepresent what's actually nearby.

## Standing validation warnings (same as every other county's register)

Do not assume any manager/contact/rating is authentic. Do not assume any
listed institution/campus is currently accredited. Do not publish Crime
Rating/Flood Risk claims without a documented methodology. Treat distances
as estimates until recalculated. Treat "Hidden Fees: None" as unverified.
Treat availability as expired until reconfirmed directly.

## Acceptance criteria before any of these can be PUBLISHED

- [ ] Every institution cross-checked against the CUE public register,
      with the three compound-name cases above specifically resolved first
- [ ] Every GPS coordinate confirmed via an independent maps-service geocode
- [ ] Every manager contact independently confirmed reachable
- [ ] Homa Bay's missing sections supplied before any verification attempt
      is even possible — there is currently nothing to call
- [ ] None of these counties are in APPROVED_COUNTY_SLUGS
      (apps/api/src/verification/verification.service.ts) — publishing
      remains code-blocked regardless of verification status until a
      human explicitly adds them, one at a time
