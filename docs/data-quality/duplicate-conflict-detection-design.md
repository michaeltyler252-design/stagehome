# Duplicate and Conflict Detection Design

**Milestone:** Phase 1, Milestone 1 — Project Foundation

Part B rules 2, 3, and 7 require removing duplication, preserving distinct
facts, and creating a conflict record rather than silently choosing between
two disagreeing sources. This document defines how that is detected and
recorded technically.

## Detection signals

During promotion from `staging.*` to canonical tables (see the import staging
design), each incoming property/university record is checked against existing
canonical rows using, in order:

1. **Exact name match** within the same county (`properties.title` or
   `universities.official_name`, case- and whitespace-normalised). This is
   the same method the master document itself used to remove the seven
   named duplicate properties in its own quality-control register (MksU View
   Apartments, Kwa Vonza Heights, Kimathi Pinnacle Hostels, KarU Plaza
   Residencies, Kutus Boulevard Apartments, Kibu Boulevard Apartments, Alupe
   Vista Apartments).
2. **Fuzzy name match** using PostgreSQL `pg_trgm` similarity above a
   configurable threshold (default 0.6), scoped to the same county/estate, to
   catch near-duplicates the exact match misses (e.g. "Station View
   Residency" appearing twice under Technical University of Kenya with
   identical spelling but different completeness — see the Nairobi property
   register).
3. **Geospatial proximity** (PostGIS `ST_DWithin`, default 150 m) combined
   with an overlapping property-category, to catch duplicates that were
   renamed between source files.

## What happens on a match

| Signal | Action |
|---|---|
| Exact name match, fields agree | Merge silently: keep the more complete record, discard the duplicate, note both `source_record_reference`s on the surviving row. This is "remove duplication in implementation, but preserve distinct facts" (Part B rule 3). |
| Exact or fuzzy name match, fields disagree | **Do not merge.** Set `conflict_status = FLAGGED` on both/all candidate rows, create an `admin_notes` entry describing the disagreement, and surface it in the administrator "conflict resolution" queue (Part K). Nothing is published while `conflict_status = FLAGGED`. |
| Fuzzy or geospatial match only, below confidence to auto-decide | Set `conflict_status = UNDER_REVIEW`, do not merge or publish, require a human decision. |

The Station View Residency case in the Nairobi property register is exactly
the second row: same name, one record complete and one truncated, appearing
under the same university heading. It is entered as `FLAGGED`, not merged,
because a truncated record is not evidence the two describe the same
underlying property in the same state — it could equally be two different
listings that happen to share a generic name ("Station View" is a common
descriptive term).

## Conflict resolution workflow (who acts on a flag)

1. Administrator reviews both source excerpts side-by-side (using
   `source_records.raw_excerpt` from each staging row).
2. Administrator either:
   - confirms they are the same property → merges, keeping the more complete
     row and recording the merge in `verification_events`;
   - confirms they are different properties → clears the flag on both, sets
     `conflict_status = RESOLVED`, and requires each to independently pass
     field verification before publication;
   - cannot determine from source alone → schedules a field-verification
     contact to the named manager for both records before any further action.
3. Every resolution writes a `verification_events` row with `method` set to
   `documentary`, `phone_call`, or `field_visit`, satisfying Part B rule 18's
   audit-trail requirement.

## Why this is a design, not an implementation, in Milestone 1

Milestone 1 is project foundation. The tables this design depends on
(`source_records`, `verification_events`, `admin_notes`, the `conflict_status`
enum) are already created in the Milestone 1 Prisma schema so that Milestone 2
("Database and seed data") can implement the matching job directly against a
stable schema, rather than migrating it mid-stream.
