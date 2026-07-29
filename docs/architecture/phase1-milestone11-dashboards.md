# Phase 1 — Nairobi City — Milestone 11: Dashboards

## Built

- `DashboardsService` — three role-scoped aggregate views (Part K):
  - **Tenant:** bookings (with unit/property/payments/agreements/instalments),
    recent support tickets, favourites/saved-search counts.
  - **Manager:** property counts by `publicationStatus`, total units, recent
    bookings across the organisation's properties, total revenue from
    succeeded payments — reuses `PropertiesService`'s exact organisation-
    membership check, so a manager still can never see another org's numbers
    through this new door either.
  - **Admin:** properties by status, flagged-conflict count, verification
    queue size, bookings by status, total users, total platform revenue,
    refunds still awaiting dual-control approval, open support tickets by
    P0–P4 priority.
- Frontend: `/account/bookings` (tenant — bookings with payment/agreement
  status), `/admin/verification` (admin — live stats + the review queue with
  working Approve/Reject actions, correctly disabling Approve on any
  `FLAGGED` conflict).

## Tests

**125 backend tests passing** (8 new — the two worth calling out:
"an Admin dashboard's refund count only includes ones still awaiting
approval, not all dual-control refunds ever" and "a manager dashboard's
revenue total defaults to 0 rather than null/undefined when nothing has
been paid yet," both realistic bugs a less careful aggregate query would
have shipped). Backend typecheck clean.

Frontend: typecheck clean, and a full production build — **16/16 routes
compile** (two new: `/account/bookings`, `/admin/verification`).

## What's still missing from Part K's fuller dashboard vision

- No analytics/reporting charts (revenue trends, occupancy over time) —
  today's dashboards are current-state snapshots, not historical series.
  Building real trend charts needs either a time-series query pattern or a
  denormalised daily-rollup table, neither of which exists yet.
- Accountant/Receptionist/Maintenance/Analyst role-specific views aren't
  separately built — they currently see the same manager dashboard an
  Owner/Manager would (the RBAC guard already allows Accountant through;
  Receptionist and Maintenance have no dashboard route at all yet). Part K
  describes each role's dashboard as functionally distinct; today they are
  not.
- The "Publish" action (moving an already-Approved property live) has a
  working API endpoint but no frontend surface yet — the admin queue view
  only shows the REVIEW stage, not an "Approved, awaiting publish" list.

## Exact next milestone

Phase 1, Milestone 12: SEO (structured data audit across all page types,
sitemap completeness now that dashboards/search exist, meta description
review, Core Web Vitals check).

## Approval gate

Stopping here per Part B rule 12.
