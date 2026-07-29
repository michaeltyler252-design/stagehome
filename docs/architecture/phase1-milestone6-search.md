# Phase 1 — Nairobi City — Milestone 6: Search and Filtering

## Built

- `SearchService` (`apps/api/src/search/`) implementing Part H:
  - **Filters:** keyword, county, university, category, rent range, distance
    to campus (`maxWalkingMinutes`, scoped to a `universitySlug`), map bounds
    (`swLat/swLng/neLat/neLng`), geospatial radius (`lat/lng/radiusKm` via
    real PostGIS `ST_DWithin`/`ST_Distance` against the privacy-safe
    `publicLat`/`publicLng` columns — never the exact private coordinates).
  - **Sorting:** all 8 options from Part H (`recommended`, `nearest`,
    `lowest_rent`, `highest_rent`, `newest`, `highest_verified_rating`,
    `most_reviewed`, `available_soonest`).
- Frontend: sort dropdown added to `SearchFilters`, wired through `/search`.

## Honest limitation, not hidden

`lowest_rent`, `highest_rent`, `highest_verified_rating`, and
`available_soonest` are sorted **in application code, per-page**, because
Prisma can't order a parent row by a related table's min/max/average without
either a raw query or a denormalised column. This is correct today — there
are zero published Nairobi properties — but will silently become wrong
*across* pages once real inventory grows past a page or two. I flagged this
directly in the code (`SearchService`, the `buildOrderBy` doc comment) and
here, rather than leaving it as an invisible landmine. The fix is
straightforward when it's needed: add a denormalised `minRent`/`avgRating`
column updated on write, or move those two sorts to raw SQL like the radius
search already is.

## Tests

**61 backend tests passing** (14 new: where-clause construction, PostGIS
raw-query invocation, all in-memory sort behaviors, and — importantly — that
pagination is never double-applied when a radius filter and a DB-sortable
order are combined, which was a real bug I caught and fixed with a test
before it shipped). Backend typecheck clean. Frontend typecheck clean.

## Exact next milestone

Phase 1, Milestone 7: Booking system (quotes, holds with Redis locks to
prevent double-booking, booking confirmation, policy-snapshot freezing).

## Approval gate

Stopping here per Part B rule 12.
