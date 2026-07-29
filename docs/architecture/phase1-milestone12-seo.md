# Phase 1 — Nairobi City — Milestone 12: SEO

## Built

- **Canonical URLs** on every public page (homepage, counties list/detail,
  universities list/detail, property detail, how-it-works) via
  `lib/seo.ts`'s `canonicalUrl()`.
- **Open Graph + Twitter Card metadata** site-wide, with a code-generated
  default share image (`app/opengraph-image.tsx`) and per-property share
  images using the listing's own first photo when one exists.
- **`BreadcrumbList` structured data** on county, university, and property
  pages (`lib/seo.ts`'s `breadcrumbJsonLd()` + the new `<JsonLd>` component).
- **Richer property structured data:** images array, `Offer.availability`,
  and an `AggregateRating` block — added **only when real reviews exist**
  (Part B rule 9: never imply a verified rating that isn't real; a property
  with zero reviews gets no `aggregateRating` field at all, not a
  zero-filled one).
- **`noindex` defense-in-depth** on every private route
  (`/manager`, `/admin`, `/account`, `/sign-in`, `/sign-up`) via per-section
  `layout.tsx` files — this backs up `robots.txt`'s disallow rules with a
  second, page-level signal, since not every crawler respects disallow for
  URLs it already knows about.
- **Sitemap now includes published properties** (previously only static
  pages, counties, and universities) — capped at 100 for now, see the
  limitation below.
- `app/manifest.ts` (PWA manifest) and a code-generated `app/icon.tsx` — no
  binary asset files needed, both render through Next's built-in
  `ImageResponse`.

## A real bug this caught

The first version of `opengraph-image.tsx` failed the actual production
build: Satori (the renderer behind `ImageResponse`) requires every `<div>`
with more than one child to declare an explicit `display` — it doesn't
default to block layout the way a browser does. The build failed with a
clear error, I fixed the two offending elements, and confirmed the full
build (all 20 routes, including `/icon`, `/manifest.webmanifest`, and
`/opengraph-image`) succeeds. This is exactly why "verify before packaging"
matters — this bug would not have been caught by typecheck alone.

## Known limitation, disclosed

`sitemap.ts` fetches only the first 100 published properties in one page.
Once Nairobi's real inventory exceeds that, this needs to become a proper
sitemap index with multiple paginated sitemap files (Next.js supports this
via `generateSitemaps()`) — flagged here rather than silently capped forever.

## Tests / verification

No new backend code this milestone (frontend-only). Frontend: **typecheck
clean, full production build succeeds — 20/20 routes**, including the three
new code-generated asset routes.

## Exact next milestone

Phase 1, Milestone 13: Security and privacy review (a systematic pass
against Part M's checklist — this is where I'd expect to find and fix real
issues, not just confirm what's already there).

## Approval gate

Stopping here per Part B rule 12.
