# Phase 1 — Nairobi City — Milestone 15: Staging Deployment

This is the final milestone for Nairobi Phase 1. It cannot be completed
*by me, in this sandbox* — deploying requires real cloud accounts, real
credentials, and a real network, none of which this environment has ever
had (every prior milestone's report has said so). What follows is
everything actually built to make deployment possible, plus an honest
go/no-go checklist for whoever runs it for real.

## What's built and ready

- **`apps/api/Dockerfile`**, **`apps/worker/Dockerfile`** — multi-stage
  builds producing minimal, non-root runtime images with health checks.
- **`apps/web/vercel.json`** — Vercel is the recommended target for the
  Next.js app (zero-config, matches Part D). **`apps/web/Dockerfile`** is
  provided as a self-hosting alternative for teams that can't use Vercel.
- **`docker-compose.staging.yml`** — a single-VM staging stack from the
  images the CD pipeline builds.
- **`.github/workflows/deploy.yml`** — tests → builds & pushes API/worker
  images to GHCR → deploys web to Vercel. Requires real secrets
  (`REGISTRY_USERNAME`/`PASSWORD`, `VERCEL_TOKEN`/`ORG_ID`/`PROJECT_ID`) that
  don't exist yet — I did not invent placeholder values for these; the
  workflow will simply fail cleanly until they're added as real GitHub
  repository secrets.
- **Structured JSON logging** (`StructuredLogger`) — production-mode logs
  are single-line JSON, ready for any log aggregator.
- **Sentry error tracking**, wired but inert until `SENTRY_DSN` is real
  (same honesty pattern as every other provider integration since
  Milestone 3).
- **`infrastructure/scripts/backup-database.sh`** — encrypted (`gpg`)
  Postgres backup template; most managed-Postgres hosts also offer native
  encrypted snapshots, which should be the primary mechanism, with this
  script as the portable fallback.

## What deploying "for real" still requires (not fabricated here)

1. A managed Postgres instance (with PostGIS + pg_trgm extensions enabled)
   and a managed Redis instance — Part D names no single mandatory
   provider; whoever deploys this picks one.
2. Actually running `pnpm db:migrate:deploy` against that real database —
   **this has never happened, in any environment, at any point across all
   15 milestones.** Every model, every relation, every index in
   `packages/database/prisma/schema.prisma` has been reviewed and
   structurally verified (table-by-table against Part F, brace-balance
   checked, `multiSchema` staging split validated) but has never been
   proven to actually apply as a migration against a live Postgres server,
   because this sandbox cannot reach `binaries.prisma.sh` to download
   Prisma's engine binary. **This is the single largest unverified risk
   carried across the entire project.**
3. Real credentials for: Daraja (payments), an SMS/email/WhatsApp provider
   (notifications), Google OAuth, Google Maps or Mapbox, S3 or R2 (media),
   Sentry, and a container registry + Vercel account.
4. DNS + Cloudflare configuration (Part D) — not addressed at all in this
   codebase; it's infrastructure-as-configuration outside the repo.
5. HTTPS termination — everything built assumes it (secure cookies would
   need it, HSTS headers already assume it), but nothing here provisions
   a certificate.

## Go/No-Go checklist

**Do NOT go live with real users/real money until every box below is
checked — this is not a formality:**

- [ ] `pnpm db:migrate:deploy` has been run against the real staging
      database and completed without error (see risk #2 above — do this
      first, before anything else, since it's the one thing that's never
      been proven to work)
- [ ] `pnpm db:seed` has run (lookup/taxonomy data only, per
      `docs/operations/seed-strategy.md`)
- [ ] The Nairobi staging import has run
      (`staging:import:nairobi`) and the duplicate-detection job has been
      run against it
- [ ] The Station View Residency conflict has been resolved by a human
      before anything from Technical University of Kenya is approved
- [ ] Real Daraja sandbox credentials tested end-to-end (see
      `docs/testing/manual-qa-checklist.md`) — **do not go live with
      Daraja production credentials until sandbox has been fully exercised**
- [ ] Real SMS/email provider tested — OTP and payment-receipt delivery
      confirmed actually arriving
- [ ] `SENTRY_DSN` configured and a test error confirmed to appear in
      Sentry
- [ ] HTTPS is terminated in front of both `apps/api` and `apps/web`
- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` are freshly generated
      production secrets, not the dev placeholders
- [ ] A real backup has been taken and a **real restore has been tested**
      — an untested backup is not a backup
- [ ] The manual QA checklist (`docs/testing/manual-qa-checklist.md`) has
      been walked end-to-end by a human on a real mobile device
- [ ] Rate limiting (Milestone 13) confirmed working against the real
      Redis instance, not just the mocked one in tests

## Exact next step

Once every box above is checked, Nairobi Phase 1 (Milestones 1–15) is
complete. The next milestone is **not** part of Nairobi at all — it's Phase
1's Kiambu county (rollout phase 2), which starts back at that county's own
Milestone 1 (research and validation), per Part C. That is a materially
different, much larger undertaking than continuing Nairobi, and should be
its own explicit decision, not an automatic continuation.

---

## Update — 2026-07-27

Since this report was written, Kiambu's Milestone 1 audit was completed
(and, subsequently, 10 more counties' Milestone 1 audits — see
`docs/architecture/all-counties-milestones-2-14-readiness.md` for the
consolidated status), and `CURRENT_ACTIVE_ROLLOUT_PHASE` has been advanced
twice: from `1` to `2` (Kiambu), then from `2` to `3` (Nakuru), each
following its own explicit approval. **None of this changes the go/no-go
checklist above** — it still governs whether Nairobi (or now, Kiambu, or
Nakuru) is safe to actually deploy and launch. Advancing the code-level
phase gate is necessary but not sufficient; every box above still needs to
be checked with real infrastructure before any county goes live for real.

## Approval gate

Stopping here per Part B rule 12 — and, more importantly, because
everything past this point requires real infrastructure decisions that
aren't mine to make on your behalf.
