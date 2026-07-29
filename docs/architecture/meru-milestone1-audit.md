# Phase 1 — Meru County (Rollout Phase 7) — Milestone 1: Source-Data Audit

## What was audited

Read Part O's Meru County section in full. **1 university, 1 property:**

- Meru University of Science and Technology (MUST) → Marimba House Residence

## A useful reversal of the usual pattern

Every prior county's GPS/campus data came from a bleed fragment that was
*less* informative than the main record. Meru inverted this: the genuine
Marimba House Residence record's own University Information text wasn't
recoverable anywhere in the document, but a truncated duplicate stub
~2,300 lines away (near a Uasin Gishu boundary) happened to contain exactly
that block (GPS, campus, county) with no property body at all. Recorded
with the same "re-confirm independently" caveat as every other bleed-found
value — being the *only* source for a value doesn't make it more reliable,
just more necessary to verify.

## Clean extraction

Boundary confirmed via the same reliable anchor pattern (ends at "Street
View: Not Available" with no trailing bleed) — verified before committing,
per the discipline established during Embu's audit.

## Tests

**57 database-package tests passing** (up from 49). Typecheck clean. Same
pattern as every county since Kiambu: zero code changes needed, only new
data files and a 6-line wrapper script.

## Status

Structurally ready pending human verification and the rollout-phase
decision — same as every other audited county.

## Approval gate

Stopping here per Part B rule 12.
