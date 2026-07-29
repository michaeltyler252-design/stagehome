# Phase 1 — Nairobi City — Milestones 3, 4, 5 (batched)

## Milestone 3 — Authentication and permissions

**Built:** `PasswordService` (Argon2id), `TokenService` (JWT access/refresh
with rotation on every refresh), `OtpService` (Redis-backed phone OTP,
rate-limited to 5 attempts, dev-mode console fallback since no SMS provider
key exists — refuses to fake-send in production without one), `MfaService`
(TOTP for admin step-up auth), `AuthService`/`AuthController` (register,
password login, phone OTP login/signup, Google OAuth — functional once real
credentials are set, refresh, logout), `AdminMfaController` (setup/verify,
Admin-only), `JwtAccessStrategy`, `JwtAuthGuard`, `RolesGuard`, `@Roles()`,
`@CurrentUser()`.

**Deliberately deferred:** a dedicated `admin_mfa_secrets` table (using
`admin_notes` as an interim store, flagged in code) — real SMS/Google
credentials, which stay `Information Required` until you provide them.

## Milestone 4 — Property-management system

**Built:** `PropertiesService`/`PropertiesController` — organisation-scoped
create/list/get/update, `submit-for-verification`, unit creation. Managers
can never see or edit another organisation's inventory; Admins bypass that
check. Every manager-created listing defaults to
`MANAGER_SUPPLIED` / `UNVERIFIED` / `DRAFT`, the same starting point as the
source-supplied Nairobi data. `VerificationService`/`VerificationController`
— the admin-only `DRAFT → REVIEW → APPROVED → PUBLISHED` workflow, refusing
to approve anything with `conflict_status: FLAGGED` (this is the exact gate
that keeps Station View Residency out of search until a human resolves it),
and refusing to publish a property whose county hasn't reached its active
rollout phase (Part C). `OrganisationsService`/`OrganisationsController` —
lets a new manager create an organisation and become its Owner, which
`PropertiesService` then authorizes against.

## Milestone 5 — Public marketplace pages

**Backend:** `PublicService`/`PublicController` — read-only
counties/universities/property-search/property-detail endpoints. Every query
is hard-scoped to `publicationStatus: PUBLISHED`; this is tested directly
(the most important tests in this batch prove unverified data cannot leak
through the public API even with no filters applied).

**Frontend:** a real design system (not the placeholder page from
Milestone 1) — Tailwind tokens, three purposefully chosen typefaces, and a
signature "verification stamp" motif built around Kenyan matatu route-board
and rubber-stamp culture, deliberately avoiding the generic AI-design
defaults (cream+terracotta serif, near-black+neon accent, hairline
broadsheet). Pages built: homepage, `/counties` + `/counties/[slug]`,
`/universities` + `/universities/[slug]`, `/search` (with filters),
`/properties/[slug]` (with schema.org `Accommodation`/`Offer` structured
data), `/sign-in` (password + phone OTP), `/sign-up`, `/manager/properties`
(dashboard: create org, list properties, submit for verification),
`/manager/properties/new`, `/how-it-works`, plus `robots.ts` and `sitemap.ts`
(Part L SEO requirements).

## Verification performed (not just claimed)

- **47 backend unit tests, all passing**, including a full Nest
  dependency-injection graph compilation test (`app.module.spec.ts`) that
  proves every module wires together correctly without a live database.
- **Backend typecheck: clean.**
- **Frontend typecheck: clean.**
- **Frontend production build: succeeds — all 14 routes compile, including
  both dynamic property/university/county routes and the static
  sitemap/robots routes.** The one build failure I hit was Google Fonts
  being unreachable from *this sandbox's* network allowlist — not a code
  bug. I confirmed this by temporarily stripping `next/font` in a scratch
  copy: the build then succeeded completely. The real repo still uses
  `next/font/google` (the correct production approach) and will build fine
  on any machine with normal internet access.

## Known limitations carried forward

- Manager auth tokens are stored in `sessionStorage` for now; httpOnly
  cookie sessions are the correct production approach and are the natural
  next step once the API sits behind HTTPS (Milestone 15's deployment gate).
- Property photos in `PropertyCard`/detail pages render from `media.storageKey`
  directly as an `<img src>` — real signed-URL/CDN delivery is Milestone 4's
  remaining media-pipeline work, deferred since it needs real S3/R2
  credentials (`Information Required`).
- No booking/payment UI yet — the "Reserve" button on the property page is
  intentionally disabled with a tooltip explaining it's Milestone 7 scope.

## Exact next milestone

Phase 1, Milestone 6: Search and filtering (PostGIS distance search, sorting,
map-bounds filtering) — the current `/search` page and `PublicService` cover
the Part H filter *fields* already; Milestone 6 adds real geospatial
querying once property GPS data has been re-extracted and geocoded per the
Nairobi verification register's extraction note.

## Approval gate

Stopping here per Part B rule 12.
