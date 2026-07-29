# Nyeri Institution Verification Register

**Phase:** 1 — Nyeri County (Part C rollout phase 13)
**Milestone:** 1 — Source-data audit and verification plan
**Status of every row:** `SOURCE_SUPPLIED_UNVERIFIED`.

## Important finding: a record nested here does not belong to Nyeri at all

The source document lists **three** university/property pairs under the
`## NYERI COUNTY` heading. Two are genuine Nyeri records. The third —
**Jaramogi Oginga Odinga University of Science and Technology (JOOUST) /
Bondo Central Residencies** — has its own address field reading "Bondo-
Barkowino Road" and its own `Town:` field reading **"Bondo"**, which is in
Siaya County, not Nyeri. JOOUST's real, well-known campus is in Bondo,
Siaya County. This isn't a naming ambiguity like Kisumu's "Kisii
University" case — it's the wrong county heading altogether for this
specific record.

**This platform excluded it from Nyeri's audit rather than either (a)
silently importing it as Nyeri data, which would be wrong, or (b) silently
reassigning it to Siaya, which isn't in the Phase 1 rollout at all and
isn't this platform's call to make unilaterally.** It's flagged here so a
human can decide: correct its county tag and hold it in staging for
whenever Siaya's phase is considered (Part C: "propose the remaining
counties after Phase 15"), or investigate further before trusting it at
all.

## Extraction note (the two genuine records)

GPS/campus values for both were found via the bleed-attachment mechanism,
same caveat as every other county.

## Register

| # | University (as supplied) | Property linked to it | Source file (as tagged) | Verification action required |
|---|---|---|---|---|
| 1 | Dedan Kimathi University of Technology (DeKUT) | Kimathi Pinnacle Hostels | Pasted text(154).txt | Confirm CUE accreditation. GPS (-0.3971, 36.9614), Campus "Main Campus (Nyeri-Nyahururu Road)" found via bleed mechanism — re-extract before use |
| 2 | Karatina University | KarU Plaza Residencies | Pasted markdown (4).md | Confirm CUE accreditation. No GPS/campus text found anywhere in the source — `Verification Required` from an independent source |
| — | Jaramogi Oginga Odinga University of Science and Technology (JOOUST) | Bondo Central Residencies | Pasted text (10).txt | **Excluded from this county's audit — see finding above.** Its own address places it in Siaya County. Do not import as Nyeri data. |

## Acceptance criteria (Phase 1 gate, Nyeri)

- [ ] Both genuine institutions cross-checked against the CUE public register
- [ ] DeKUT's GPS coordinate re-extracted from the original source file
      and confirmed via a maps-service geocode
- [ ] Karatina University's campus/GPS obtained from an independent source
- [ ] The JOOUST/Bondo Central Residencies miscategorization resolved by a
      human before that record is imported anywhere
