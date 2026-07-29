# Phase 1 Rollout — Source-Data Availability Audit

Discovered while starting Mombasa's Milestone 1 (rollout phase 4). Before
building anything further, this needed to be checked and reported, not
quietly worked around.

## The finding

Part C's 15-county rollout order was cross-checked against every county
section actually present in Part O of the master document. **3 of the 15
rollout counties have zero property/university records anywhere in the
source data:**

| Phase | County | Source data present? |
|---|---|---|
| 1 | Nairobi City | ✅ Audited (11 properties) |
| 2 | Kiambu | ✅ Audited (3 properties) |
| 3 | Nakuru | ✅ Audited (1 property) |
| 4 | **Mombasa** | ❌ **None.** Only appears as a rollout-list entry (line 89); zero property or university records anywhere in Part O. |
| 5 | Kisumu | ✅ Present, not yet audited |
| 6 | Embu | ✅ Present, not yet audited |
| 7 | Meru | ✅ Present, not yet audited |
| 8 | Tharaka-Nithi | ✅ Present, not yet audited |
| 9 | Machakos | ✅ Present, not yet audited |
| 10 | Uasin Gishu | ✅ Present, not yet audited |
| 11 | Kakamega | ✅ Present, not yet audited |
| 12 | **Kisii** | ❌ **None in the original master document.** The only "Kisii" text there is "Kisii University – Kisumu Campus" — an institution *located in Kisumu County*, not a Kisii County record. **Update 2026-07-27: real data since supplied from a different source — see below.** |
| 13 | Nyeri | ✅ Present, not yet audited |
| 14 | Kirinyaga | ✅ Present, not yet audited |
| 15 | **Murang'a** | ❌ **None in the original master document.** No occurrence anywhere in that document outside the rollout list itself. **Update 2026-07-27: real data since supplied from a different source — see below.** |

## Why this matters and what it means

Part C also states: *"The supplied property dataset contains records from
counties outside this rollout. Import them into a private staging dataset,
but do not launch those counties before their approved phase."* This
confirms the dataset and the rollout list were never meant to be a perfect
1:1 match — but it does not resolve the gap for Mombasa, Kisii, or
Murang'a specifically, since there's no misplaced data to reassign to them
either. (For reference: the document does contain several counties *not*
in the top-15 rollout — Baringo, Bomet, Bungoma, Busia, Elgeyo Marakwet,
Homa Bay, Kericho, Kitui, Vihiga, Laikipia, and Nandi all have real
records, staged for whenever their phase is approved, per that same rule.)

## What I am NOT doing about this

Not inventing placeholder universities or properties for Mombasa, Kisii, or
Murang'a to keep the per-county audit pattern visually consistent. Not
silently skipping ahead to Kisumu without flagging the gap. Not treating
"no data found" as equivalent to "verified empty" — it's simply unaudited
because there is nothing to audit yet.

## What actually needs to happen for these three counties

A real data-sourcing effort — the same kind of work that must have produced
the other 12 counties' records in the first place (site visits, manager
outreach, existing listing aggregation, or a paid data-collection vendor).
This is not something a coding pass can substitute for, and I'm not going to
pretend otherwise by generating plausible-sounding fake listings.

## What continues normally

Kisumu (phase 5) has real source data and is the next county to audit,
picking up exactly where the established Milestone-1 pattern left off.

---

## Update — 2026-07-27: Murang'a and Kisii each received real data from a new source

The user directly supplied a second source document ("Kenya Premium Rental
Marketplace Knowledge Base," distinct from the original master document)
containing one property/university record for each of Murang'a and Kisii.
Both were processed with the same audit rigor as every county from the
original document — see
`docs/data-quality/muranga-institution-verification-register.md`,
`muranga-property-verification-register.md`,
`kisii-institution-verification-register.md`, and
`kisii-property-verification-register.md`.

**This does not fully close either gap:**

- **Murang'a's supplied record is complete** (all sections present) and is
  now in the same state as any other single-property county (e.g. Nakuru,
  Meru) — audited, unverified, staged.
- **Kisii's supplied record is itself incomplete** — the source text cuts
  off mid-Amenities section, before Contact Details even appears. Kisii is
  the *only* county register across this entire project missing contact
  details entirely; every other property, however thin otherwise, has at
  least a phone number to call. Kisii cannot proceed to manager-outreach
  verification until a fuller version of this record is supplied.

**Mombasa remains the one true zero-data gap.** No source — the original
master document or this new one — has ever mentioned it beyond the
rollout-list line. If further source documents become available, Mombasa
specifically is the one still worth checking against them.

**Corrected status, 15-county rollout:** 14 of 15 counties now have at
least some source data (Nairobi through Murang'a, excluding only Mombasa).
13 of 15 have a *usable* record for verification outreach (all except
Mombasa, which has none, and Kisii, whose one record lacks contact
details).

---

## Update — 2026-07-27 (later the same day): Mombasa gap closed

The user supplied a real Mombasa record from the same second source
document ("Kenya Premium Rental Marketplace Knowledge Base") that resolved
Murang'a and Kisii: Technical University of Mombasa (TUM) → Tudor Crest
Apartments. **This is a complete record** — same standing as Murang'a's,
not Kisii's. See
`docs/data-quality/mombasa-institution-verification-register.md`,
`mombasa-property-verification-register.md`, and
`docs/architecture/mombasa-milestone1-audit.md`.

**Final status, 15-county rollout: all 15 counties now have at least some
source data.** 14 of 15 have a usable record for verification outreach
(every county except Kisii, whose one record still lacks contact details
and cannot proceed to manager outreach until a fuller version is
supplied). There is no longer a "zero data" county anywhere in the Phase 1
rollout — the remaining work everywhere is verification, not sourcing.
