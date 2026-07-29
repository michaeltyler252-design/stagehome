# Changelog

## Property promotion pipeline (the real cause of empty Search/Counties), registration "Failed to fetch" root-cause fixes, and a real HTTP-level e2e test suite

**Root cause of "NO VERIFIED LISTINGS MATCH YET" and empty counties — a
real gap, not just "nobody ran the pipeline yet":** every county's staging
import has always written real, audited property data into
`staging.raw_property_records`, and that table already had a
`promotedPropertyId` column reserved for promotion — but nothing anywhere
ever promoted a raw property record into `public.properties`. Unlike
universities (which got a promotion service in an earlier session),
properties had no equivalent at all. `public.properties` had zero
`SOURCE_SUPPLIED` rows in every environment; search and the county pages
were correctly showing nothing, because there was genuinely nothing to
show.

**Fixed:**
- Added `PropertyPromotionService`/`PropertyPromotionController`
  (`apps/api/src/verification/property-promotion.service.ts`,
  `.controller.ts`), mirroring `UniversityVerificationService`: `promote()`
  moves a staged raw record into `public.properties` at
  `publicationStatus: REVIEW` / `verificationStatus: PENDING` — it lands
  directly in the existing admin review queue
  (`VerificationService.listReviewQueue()` already filters on `REVIEW`),
  so no new admin approve/reject workflow was needed, only a promotion
  step feeding the one that already existed. Never invents pricing,
  bedroom counts, or a campus link the source data doesn't contain — only
  sets title, description, and county from what was actually supplied.
  Source-supplied properties are attributed to one upserted "StageHome
  Verified Sources" organisation (the same concept already described to
  students on `/how-it-works` — "sourced from public listings" — not a new
  invention), since `Property.organisationId` is required by the schema
  and there is no real manager account for source-imported listings.
- Added `packages/database/src/staging/promote-properties.ts`
  (`pnpm staging:promote-properties`) to bulk-run promotion across every
  imported county, mirroring `promote-universities.ts`.
- Added a Property promotion queue section to `/admin/verification`
  (Promote button, feeding straight into the existing Approve/Reject
  queue below it) and the matching `apiClient` methods.
- Added unit tests (`property-promotion.service.spec.ts`) covering the
  not-found/already-promoted/unresolvable-county cases, the Nairobi county
  alias, organisation de-duplication, and the exact REVIEW/PENDING/
  SOURCE_SUPPLIED fields set.
- Added `packages/database/src/staging/dev-seed-search-data.ts`
  (`pnpm dev:seed-search-data`) — a `NODE_ENV=development`/`test`-gated
  script that imports, promotes, approves, and publishes real properties
  for the three currently-approved counties (`nairobi-city`, `kiambu`,
  `nakuru` — `publish()` still enforces `APPROVED_COUNTY_SLUGS`, this
  script does not bypass that gate), using only the real Kenyan
  university/property source data already bundled in
  `packages/database/prisma/seed-data/`. Pair with
  `pnpm dev:promote-and-verify-universities` for full demo data.

**Registration "Failed to fetch" — most likely cause identified, but not
independently confirmable without access to the actual deployed
environment:**
- `ENVIRONMENT_VARIABLES.md` incorrectly listed `WEB_APP_ORIGIN` and
  `NEXT_PUBLIC_API_BASE_URL` as "safe to use as-is (no action needed)" —
  their localhost defaults are exactly what breaks a real deployment, and
  this mis-documentation plausibly caused the actual misconfiguration.
  Corrected, with an explicit explanation of each variable's failure mode.
- `apps/api/src/main.ts`: CORS previously defaulted `WEB_APP_ORIGIN` to an
  empty array when unset, which the `cors` package treats as "no origin is
  ever allowed" — silently blocking every cross-origin request (including
  registration) from a deployed frontend, with nothing in the API's own
  logs to explain why. The API now refuses to boot in production if
  `WEB_APP_ORIGIN` is unset, matching this project's existing "refuse
  cleanly with a clear error" rule for every other required secret.
- `apps/web/lib/api-client.ts`: now detects and logs a specific, actionable
  console error if the resolved API base URL is still `localhost` while
  the page itself is running on a real deployed origin — the single most
  common cause of this exact bug (`NEXT_PUBLIC_API_BASE_URL` is a
  build-time value; setting it only in a local `.env` does nothing for a
  Vercel deployment). Network failures now also report the URL they tried
  to reach instead of a bare, undiagnosable "Failed to fetch".
- `DEPLOYMENT_GUIDE.md` gained a new, prominent section on these two
  variables specifically, since the guide previously covered Vercel build
  configuration in detail but never mentioned setting either of them.

**New: a real HTTP-level e2e test suite** (`apps/api/src/__tests__/registration-and-cors.e2e.spec.ts`,
using `supertest`, newly added as a devDependency — this project's test
suite was previously unit tests only). Boots the actual NestJS HTTP stack
— the real `ValidationPipe`, the real CORS middleware, the real route
table, and a real Redis instance for `RateLimitGuard` — with only
`PrismaService` swapped for an in-memory mock. Directly verifies: a
configured frontend origin gets `Access-Control-Allow-Origin` and an
unconfigured one doesn't (reproducing exactly what a `WEB_APP_ORIGIN`
mismatch looks like at the HTTP level); `POST /auth/register` returns a
real 201/400/409 — never an unhandled 500 — for valid, malformed, and
duplicate input; and `GET /public/counties` returns a working `200` with
`[]` when there's no published/verified data, demonstrating that the
reported empty-state pages are what a *successful* request with no data
looks like, distinct from a broken one.

No existing property, county, university, auth, booking, payment, review,
or blog functionality was removed or altered beyond the fixes above.

## Final production-readiness audit and packaging

**Real toolchain verification (not just static review):** installed
Postgres 16 + PostGIS, Redis, and pnpm in the audit environment and ran
`tsc --noEmit`, ESLint, and the full Jest suite for real. Found and fixed:
2 genuine `noImplicitAny` errors in `public.service.ts`, 2 genuine
`react/no-unescaped-entities` lint errors (`privacy-policy`,
`cookie-policy` pages), and one real UI gap — `BlogPost.coverImageUrl`
existed in the schema and DTO but was never rendered anywhere; it's now
shown on both the blog list and detail pages. `apps/api` builds cleanly
(`nest build`); `apps/web`'s `next build` was confirmed to fail for exactly
one reason (a sandboxed environment without internet access to fetch
`next/font/google`'s stylesheet at build time) — not a code defect, and not
reproducible in any real CI/deploy environment with normal internet access.

**Real gap found and fixed: no way to ever become an Admin.** Every user
who registers gets the "Tenant" role; the "Admin" `Role` row is seeded with
every permission, but nothing — no seed, no script, no endpoint — ever
attached it to an actual user. On a fresh deployment this meant
`/admin/verification` and every admin-only endpoint (property verification,
university verification, blog authoring) was permanently unreachable.
Added `packages/database/src/staging/grant-admin-role.ts`
(`pnpm --filter @student-housing/database grant-admin-role -- <email>`), a
deliberately CLI-only, database-side script — never an HTTP endpoint, since
an API route that could grant Admin would let any authenticated user
self-escalate.

No existing functionality was removed or altered beyond the fixes above.

## Reviews, blog, data-driven county visibility, dev university seeding, and legal/404/footer gaps

**Reviews & ratings — previously unexposed:** the `Review`/`ReviewCategory`/
`ReviewResponse` Prisma models, the search service's `most_reviewed` /
`highest_verified_rating` sort options, and `getPropertyBySlug`'s
`reviews: { include: { categories: true } }` include all already existed —
but nothing ever wrote a review or exposed a way to respond to one. Added
`apps/api/src/reviews/` (`ReviewsService`/`ReviewsController`/`ReviewsModule`):
a tenant may review a property only via a `COMPLETED` booking they own, once
per booking; a manager (organisation member) or Admin may post one response.
Registered in `AppModule`. The property detail page was also computing an
`aggregateRating` for JSON-LD SEO but never rendering reviews for human
visitors — added a visible Reviews section. Added a review-submission form
to the tenant's `/account/bookings` page for `COMPLETED`, not-yet-reviewed
bookings (added `reviews: { select: { id: true } }` to the tenant dashboard's
booking include so the UI knows which bookings already have one).

**Blog — previously nonexistent:** added a `BlogPost` model to
`schema.prisma` (reusing the existing `PublicationStatus` enum rather than a
new one), `apps/api/src/blog/` (public read endpoints + Admin-only
create/update/publish/unpublish), and `/blog` + `/blog/:slug` pages on the
web app, linked from the header nav, footer, and sitemap. Requires a Prisma
migration in a real environment (`pnpm --filter @student-housing/database
prisma:migrate:dev --name add_blog_posts`) — no migration could be generated
in this delivery since there was no live Postgres instance to run it
against.

**County visibility — was a hand-maintained slug list, now query-driven:**
`PublicService.listCounties()` / `getCountyBySlug()` previously gated on a
static `COUNTIES_WITH_DATA` array that had to be edited by hand every time a
county's data cleared verification. Replaced with a live query: a county is
visible once it has at least one `PUBLISHED` property OR one `VERIFIED`
university, computed at request time. A county now appears or disappears the
moment its underlying data does — no code change required. Updated
`public.service.spec.ts` to match.

**University verification — closing the loop for real data, not just
pipeline code:** the promotion pipeline (`UniversityVerificationService`,
`staging:promote-universities`) already existed and was already correct.
What was missing was (a) any way for an admin to actually use it without
calling the API directly, and (b) a way to see real, non-empty data in a
fresh dev environment. Added a University section to `/admin/verification`
(promotion queue with a Promote action, verification queue with
Verify/Reject actions) and the matching `apiClient` methods. Added
`packages/database/src/staging/dev-promote-and-verify-universities.ts`
(`pnpm dev:promote-and-verify-universities`) — refuses to run unless
`NODE_ENV` is `development` or `test`, and is explicit in its own output and
audit-log notes that it is not a real Commission for University Education
check. This never touches production and never invents universities; it
only advances already-staged, real source records through the existing
promote/verify states.

**Other previously-identified gaps closed:** `/privacy-policy`, `/terms`,
`/cookie-policy` pages; a custom `not-found.tsx` (404) with search and
navigation back into the site; footer social links (Facebook, Instagram, X,
TikTok, LinkedIn, YouTube) and footer/legal links; all added to the sitemap.

No existing property, county, university, auth, booking, payment, or
dashboard functionality was removed or altered beyond the specific fixes
described above.

## University promotion pipeline — fixes "No universities loaded yet"

**Root cause:** `public.universities` had zero rows in every environment.
Staging import scripts (`staging:import:*`) only ever wrote to
`staging.raw_university_records`; nothing in the codebase promoted those
records into the canonical `University` table described in
`docs/data-quality/source-import-staging-design.md`. The property side of
that same design already had this (`VerificationService.approve/publish/
reject`); the university side was never built. A second, independent bug
compounded it: `PublicService.listUniversities()`'s own comment said it
should filter out unverified rows, but the query had no such filter at all
— moot only because there were never any rows to filter.

**Fixed:**
- Added `UniversityVerificationService` / `UniversityVerificationController`
  (`apps/api/src/verification/`), mirroring the existing property workflow:
  `promote()` moves a staged raw record into `public.universities` at
  `verificationStatus: PENDING` (mechanical, never invents a verification
  outcome), and `verify()` / `reject()` are the explicit, audited admin
  actions that check the institution against the Commission for University
  Education register and move it to `VERIFIED` or `REJECTED`. Duplicate
  institution names (case-insensitive exact match) attach to the existing
  row instead of creating a second one.
- Added `packages/database/src/staging/promote-universities.ts`
  (`pnpm staging:promote-universities`) to bulk-run the mechanical
  promotion step across every already-imported county in one pass. It never
  sets `VERIFIED` — that stays a human decision.
- `PublicService.listUniversities()` and `getUniversityBySlug()` now filter
  on `verificationStatus: "VERIFIED"`, matching what the web app's own
  empty-state copy already promises students ("added once ... confirmed
  against the Commission for University Education register"). Direct-URL
  access to an unconfirmed university's page is blocked the same way
  `getCountyBySlug()` already blocks unapproved counties.
- Added unit tests (`university-verification.service.spec.ts`) covering
  promote/attach/verify/reject and the county name-resolution edge case
  (Nairobi's staging name vs. its canonical "Nairobi City" record).

No existing property, county, auth, booking, or dashboard functionality was
touched.

## County import batch — 10 new counties, 47-county master restructure, and a real gating-logic fix

**Duplicate check performed first, as requested:** cross-referenced every
document supplied against the existing database before importing anything.
Confirmed genuine duplicates (byte-identical properties already staged) for
Machakos, both Nyeri properties, Kirinyaga, Embu, Tharaka-Nithi, Meru, both
Kiambu properties, Uasin Gishu, Nakuru, Kakamega, and all 11 original
Nairobi properties. None of these were re-imported.

**10 new counties imported, 12 new properties:** Kitui (Kwa Vonza Heights),
Elgeyo Marakwet (Tambach Vista Residences), Nandi (Nandi Hills Elite
Suites), Baringo (Kabarnet Heights Plaza), Laikipia (Nyahururu Horizon
Hub), Vihiga (2 properties — Ebunangwe Heights Plaza, Kaimosi Academic
Enclave), Bungoma (Kibu Boulevard Apartments), Busia (Alupe Vista
Apartments), Siaya (Bondo Central Residencies — this resolves a record
previously flagged and excluded from Nyeri's data as likely misfiled; now
confirmed under its correct county), Homa Bay (Tom Mboya Academic Heights
— severely incomplete, source cuts off before any pricing or contact
details; preserved exactly as supplied, nothing invented to complete it).

**Master county structure replaced:** `ROLLOUT_COUNTIES` now lists all 47
Kenyan counties in the operator's specified order (previously 15, in a
different order). A new `COUNTIES_WITH_DATA` list tracks which counties
actually have imported source data (25, after this batch).

**A real architectural bug found and fixed before it could cause harm:**
the previous publish-gate used a numeric threshold
(`rolloutPhase <= CURRENT_ACTIVE_ROLLOUT_PHASE`). Renumbering to the new
47-county order moved Nakuru from position 3 to position 11 — no longer
adjacent to Nairobi(1)/Kiambu(2). Applying the new numbering naively would
have forced an impossible choice: silently un-approve Nakuru, or silently
approve 8 counties (Embu, Meru, Tharaka-Nithi, Nyeri, Kirinyaga, Murang'a,
Nyandarua, Laikipia) that were never actually decided on. Replaced the
numeric threshold with an explicit `APPROVED_COUNTY_SLUGS` set
(`["nairobi-city", "kiambu", "nakuru"]`), which cannot drift when the
master county list is reordered or expanded. A dedicated regression test
proves Embu — positioned between two approved counties in the new list —
is still correctly refused.

**"Don't show empty counties" implemented:** the public `/counties`
endpoint and direct county-slug lookups now filter against
`COUNTIES_WITH_DATA`. A county that's seeded as platform taxonomy but has
zero imported properties (22 of the 47, as of this batch) is excluded
entirely — no empty pages, no placeholder listings, confirmed by a
dedicated test (`narok`, a real seeded county with no data, both absent
from the list and 404s on direct lookup).

**Verified, fresh, this session:**
- Database package: 196/196 tests passing (up from 131), clean lint, clean typecheck
- Backend API: 177/177 tests passing (up from 175), clean lint, clean typecheck, clean build
- Frontend: clean lint, clean typecheck, clean build (20/20 routes)

## Vercel deployment fix, round 2: "No Next.js version detected"

A third, distinct Vercel error was reported after the previous round's fix:
`No Next.js version detected`.

**Root cause:** Vercel's Next.js version-detection step inspects
`package.json` at whatever it considers the project root — the repository
root, absent a "Root Directory" dashboard setting. The root `package.json`
never declared `next` as a dependency (it only orchestrates the monorepo),
so detection found nothing — a separate failure mode from the previous
round's custom-command scoping, and one that operates independently of
`buildCommand`/`installCommand` entirely.

**Fix:**
1. Added `next`, `react`, `react-dom` as direct dependencies of the root
   `package.json`, purely so a root-level scan finds a real Next.js
   dependency.
2. Changed the root `vercel.json`'s `installCommand` to
   `npm install && cd apps/web && npm install` — installs at both the
   repo root and inside `apps/web`, so a real, resolvable `next` package
   exists wherever Vercel's detection actually looks.

**Verified, not assumed:** ran the exact new `installCommand` from a full
repo checkout — `next` resolves at the root
(`require.resolve('next/package.json')`, real path, version `14.2.35`,
satisfies `^14.2.5`) — then ran the exact `buildCommand`, confirmed
`apps/web/.next` built successfully (all routes), and confirmed
`apps/api/node_modules` still never gets created. Re-ran the full project
audit: backend API 175/175 tests, database 131/131 tests, both clean lint
— unaffected by this change. Netlify's `netlify.toml`/`.npmrc` confirmed
untouched and still correct (no new Netlify-specific error was reported
this round, so nothing there was changed).

**Disclosed honestly:** the fully reliable fix for this class of error is
Vercel's own documented "Root Directory" project setting, which only the
project owner can set in their Vercel dashboard — no repository-side
change can fully replace it. `DEPLOYMENT_GUIDE.md` now says this
explicitly rather than implying the file-based fixes alone are a complete
substitute.

## Vercel deployment fix, round 1

A real Vercel deploy failure was reported:
```
sh: line 1: nest: command not found
npm run build exited with 1
```

**Root cause:** the repo root's `package.json` has an unscoped
`"build": "turbo run build"` script, which builds *every* workspace
package via Turborepo — including `apps/api`, whose build script is
`nest build`. Vercel should only ever build the frontend
(`apps/web`); it was never supposed to touch the NestJS backend at all.
This was compounded by two other real bugs: no `pnpm-lock.yaml` was ever
committed to the repository, and the previous `apps/web/vercel.json` used
`pnpm install --frozen-lockfile`, which fails outright with no lockfile
present.

**Fix:**
1. New root-level `vercel.json` — explicitly scopes both install and
   build to `apps/web` only, using plain `npm` (no pnpm, no Turborepo),
   since `apps/web` has zero internal workspace dependencies and doesn't
   need either.
2. Simplified `apps/web/vercel.json` — removed the monorepo-reaching
   `cd ../.. && pnpm ...` logic that could reintroduce the same failure
   if a Vercel project's dashboard "Root Directory" is ever set to
   `apps/web` directly.
3. New `.vercelignore` — excludes `apps/api`, `apps/worker`, and
   `packages/database` from the Vercel upload entirely, removing any
   remaining path by which the backend could be discovered and built.

**Verified, not assumed:** the exact `installCommand` and `buildCommand`
from the new `vercel.json` were run from a full repository checkout
(simulating exactly what Vercel does) — confirmed `apps/api/node_modules`
was never created, and the build produced `apps/web/.next` correctly with
all 20 routes compiling. Also re-confirmed, unaffected by this change:
backend API 175/175 tests passing (and its own `nest` CLI resolves
correctly, `v10.4.9`, in its own proper install context — its Docker/Render
deploy path was never actually broken), database package 131/131 tests
passing.

## Netlify deployment fix, round 2

A second, more specific Netlify error was reported: *"the publish
directory is incorrectly set to the project root instead of the proper
Next.js output"* — alongside the `styled-jsx` error persisting.

**Root cause found:** the previous round's `netlify.toml` explicitly set
`publish = ".next"` alongside `base = "apps/web"`. `@netlify/plugin-nextjs`
v5 manages the publish directory itself as part of its SSR/ISR wiring;
manually overriding it conflicted with the plugin's own path resolution
and caused Netlify to silently fall back to publishing the repository
root — precisely matching the reported symptom.

**Fix:** removed the `publish` line from `netlify.toml` entirely, with a
comment explaining why it must stay unset. Verified: a fresh build
produces `apps/web/.next` correctly (`BUILD_ID`, manifests, cache all
present) exactly where the plugin will look for it.

**Also documented, since it can't be fixed from this codebase:** Netlify's
dashboard UI build settings (if manually configured on the user's account)
override `netlify.toml` entirely. Added an explicit checklist to
`DEPLOYMENT_GUIDE.md` for clearing those and clearing the build cache,
since a stale cache or dashboard override would make this fix appear not
to work through no fault of the file itself.

## Netlify deployment fix, round 1

A real Netlify deployment failure was reported:
`Runtime.ImportModuleError: Cannot find module 'styled-jsx/style'` — a
known issue when deploying a Next.js app from a pnpm monorepo, since
pnpm's strict node_modules layout can hide `next`'s internal `styled-jsx`
dependency from Netlify's serverless-function bundler. Netlify support had
never actually been built for this project before (only Vercel and
Docker self-hosting were configured). Fixed with three changes, verified
together:
1. Root `.npmrc` (`shamefully-hoist=true`) — flattens `node_modules`.
2. Root `netlify.toml` — the official `@netlify/plugin-nextjs` build
   plugin, required for correct Next.js SSR/ISR on Netlify at all.
3. `apps/web/package.json` — `styled-jsx` declared as an explicit direct
   dependency, pinned to `5.1.1` (the exact version bundled by Next 14.2.5).

Verified: fresh `npm install` resolves `styled-jsx/style` to a real
top-level path; full `next build` still succeeds, 0 lint errors, all 20
routes compile.

## Merge verification

The 17 modular packages previously delivered were extracted and
cross-checked file-by-file. **Result: zero conflicts found** — every
overlapping module (`properties/`, `bookings/`, `verification/`, `auth/`,
the Prisma schema, the county seed data, the SEO files) was byte-identical
across every package it appeared in. This is expected and was proven, not
assumed: all 17 packages were extractions of one single source, never
divergent forks, so there was nothing to reconcile. A full fresh
build/test/lint pass was re-run anyway per the request:
- Backend API: 175/175 tests, clean typecheck, clean build, 0 lint issues
- Database: 131/131 tests, clean typecheck, 0 lint issues
- Frontend: clean typecheck, clean build (20/20 routes), 0 lint issues

Added this round: `DEPLOYMENT_GUIDE.md`, `MIGRATION_GUIDE.md`,
`ENVIRONMENT_VARIABLES.md`, this `CHANGELOG.md`.

## Data — 15 of 15 rollout counties audited (chronological)

- **Nairobi** — 11 properties, 11 universities. One unresolved duplicate
  (Station View Residency) intentionally flagged, not merged.
- **Kiambu** — 3 properties. One incomplete-in-source record (Zetech
  University / Juja Academic Heights), flagged per the source's own note.
- **Nakuru, Kisumu, Embu, Meru, Tharaka-Nithi, Machakos, Uasin Gishu,
  Kakamega, Nyeri, Kirinyaga** — 1–3 properties each, audited in sequence.
  Two real miscategorizations caught and excluded rather than silently
  absorbed: "Kisii University" is actually in Kisumu County; a JOOUST/Bondo
  Central Residencies record nested under Nyeri's heading actually belongs
  to Siaya County.
- **Murang'a, Kisii, Mombasa** — originally flagged as having zero source
  data anywhere; later resolved from a second, user-supplied source
  document. Murang'a and Mombasa: complete records. Kisii: genuinely
  incomplete (cuts off before Contact Details) — disclosed, not filled in.
- **Result:** all 15 rollout counties now have real source data; 14 of 15
  have a usable record for verification outreach.

## Milestone 15 — Staging deployment configuration
Dockerfiles (api/worker/web), CD pipeline, structured JSON logging, Sentry
wiring (inert until configured), encrypted-backup script template, go/no-go
checklist.

## Milestone 14 — QA
Found and fixed: a completely untested RBAC guard (`RolesGuard`), a
completely untested `OtpService`, a test-suite bug that silently exercised
the wrong code branch, 2 real accessibility lint errors. Coverage raised
from 140 to 166 tests at the time.

## Milestone 13 — Security review
Found and fixed: no brute-force protection on auth endpoints (added
Redis-backed rate limiting), refresh tokens stored in plaintext (fixed to
SHA-256 hash-at-rest), a "dual control" refund flag with no actual
second-approval mechanism (built one — the requester cannot approve their
own refund), no explicit CSP (added). Ran a dependency vulnerability scan;
flagged one real production-relevant finding (`multer`, high severity)
without force-applying a risky major-version bump.

## Milestone 12 — SEO
Canonical URLs, Open Graph/Twitter cards, breadcrumb structured data,
review-gated `AggregateRating` (never fabricated), `noindex` on private
routes, PWA manifest, code-generated icon/OG image. Caught a real Satori
rendering bug in the OG image generator during the build, fixed it.

## Milestone 11 — Dashboards
Tenant/manager/admin aggregate views, admin verification queue UI.
Disclosed gaps: no historical/trend analytics, no distinct
Accountant/Receptionist/Maintenance/Analyst dashboard views yet.

## Milestone 10 — Notifications and support
Email/SMS/WhatsApp dispatch with preference gating and per-channel fault
isolation, wired into real trigger points (agreement signing link,
payment receipt, booking confirmed) rather than left unused. Support
tickets with P0–P4 priority.

## Milestone 9 — Agreements and signatures
Authenticated per-signatory signing links, SHA-256 document hashing, full
audit trail (viewed/consented/signed events), sealed-once-fully-signed with
a hard code guard against re-generating a signed agreement.

## Milestone 8 — Payment system
M-Pesa Daraja STK push, idempotent initiation, replay-safe webhook
handling, real balanced double-entry ledger, refund dual control. Payment
confirmation only ever happens from the Daraja callback, never a redirect.

## Milestone 7 — Booking system
Quote → Redis-locked hold (prevents double-booking) → confirm (freezes
pricing/policy). Tested the specific race condition this exists to prevent.

## Milestone 6 — Search and filtering
Real PostGIS geospatial radius search, map-bounds filtering, all 8 Part-H
sort modes. Caught and fixed a real double-pagination bug when radius
search and a DB-sortable order were combined.

## Milestones 3–5 — Auth, property management, public marketplace
Password/phone-OTP/Google auth, JWT rotation, Argon2id, admin TOTP MFA,
RBAC; organisation-scoped property/unit CRUD; public read-only marketplace
API hard-scoped to `PUBLISHED` data only; full frontend design system and
page set.

## Milestone 2 — Database and seed data
Staging schema (separate Postgres schema from public tables), lookup-data
seed script, generalized multi-county staging-import pipeline.

## Milestone 1 — Project foundation
Monorepo scaffold, 94-model Prisma schema (cross-checked table-by-table
against the specification with zero omissions), Nairobi source-data audit,
verification registers, duplicate/conflict-detection design.
