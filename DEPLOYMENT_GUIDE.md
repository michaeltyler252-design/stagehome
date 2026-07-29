# Deployment Guide

This describes how to actually deploy StageHome. It is a companion to
`docs/operations/phase1-milestone15-staging-deployment.md` (the detailed
go/no-go checklist) — read both before deploying for real.

## 1. Provision infrastructure

- A managed PostgreSQL instance with the **PostGIS** and **pg_trgm**
  extensions enabled (used by `packages/database/prisma/schema.prisma`'s
  geospatial search and fuzzy-duplicate detection).
- A managed Redis instance (booking-hold locks, OTP storage, rate limiting).
- A container registry (the CD workflow pushes to GHCR by default —
  `.github/workflows/deploy.yml`).
- A host for the API + worker containers (Render, Railway, Fly.io, or ECS
  all work — `apps/api/Dockerfile` and `apps/worker/Dockerfile` are
  generic multi-stage builds, not tied to one provider).
- Vercel for the Next.js frontend (recommended, zero-config —
  `vercel.json` at the repo root), or self-host via `apps/web/Dockerfile`,
  or Netlify (see the dedicated section below).

## Deploying the frontend to Vercel

Connect this repository to Vercel directly — **do not** set a custom Root
Directory in the Vercel dashboard; leave it at the repo root. The
root-level `vercel.json` handles scoping the build to `apps/web` only.

**A real error and its fix:** a Vercel deploy failed with:
```
sh: line 1: nest: command not found
npm run build exited with 1
```
**Root cause:** the repo's root `package.json` has an unscoped
`"build": "turbo run build"` script, which builds *every* workspace
package — including `apps/api`, whose own build script is `nest build`.
Vercel is only supposed to build the frontend; it should never have
touched the NestJS backend at all. Compounding this, no `pnpm-lock.yaml`
was committed to the repo, and the previous `apps/web/vercel.json` used
`pnpm install --frozen-lockfile` — which fails immediately with no
lockfile present.

**Fix:** the root `vercel.json` now explicitly scopes both install and
build to `apps/web` only, using plain `npm` (not pnpm/Turborepo), since
`apps/web` has zero internal workspace dependencies and doesn't need
either. A `.vercelignore` also excludes `apps/api`, `apps/worker`, and
`packages/database` from the upload entirely, so there's no path by which
Vercel could ever discover and attempt to build the backend again.

**A third real error, and its fix:** *"No Next.js version detected."*
This happens because Vercel's Next.js version-detection step inspects
`package.json` wherever it considers the project root — which, without a
"Root Directory" set in the Vercel dashboard, is the **repository root**,
not `apps/web`. The repo root's `package.json` never declared `next` as a
dependency at all (it only orchestrates the monorepo via Turborepo), so
this check found nothing, independent of the custom `buildCommand` already
in place.

**Fix, two parts:**
1. `next`, `react`, and `react-dom` are now also declared as direct
   dependencies in the **root** `package.json` — purely so Vercel's
   root-level scan finds a real Next.js dependency to detect.
2. The root `vercel.json`'s `installCommand` now installs at **both**
   levels:
```json
{
  "installCommand": "npm install && cd apps/web && npm install",
  "buildCommand": "cd apps/web && npm run build",
  "outputDirectory": "apps/web/.next",
  "framework": "nextjs"
}
```
   so a real, resolvable `next` package exists in root `node_modules`
   too, not just inside `apps/web`, in case Vercel's version check needs
   an actually-installed package rather than just a package.json entry.

**Verified, not assumed:** ran the exact new `installCommand` from a full
repository checkout — confirmed `next` resolves at the root
(`require.resolve('next/package.json')` → real path, version `14.2.35`,
satisfying `^14.2.5`) — then ran the exact `buildCommand` and confirmed
`apps/web/.next` built successfully, all routes compiling, with
`apps/api/node_modules` still never created.

### The one thing I genuinely cannot fix from this codebase

**The officially correct, Vercel-documented solution for monorepos is to
set this project's "Root Directory" to `apps/web` in the Vercel dashboard**
(Project Settings → General → Root Directory). This makes Vercel treat
`apps/web` as the actual project root for *every* purpose — dependency
detection, framework detection, output detection — not just for a custom
build command, which is a more reliable mechanism than anything a
repo-root `vercel.json` can fully replicate. The fixes above are a
defensive fallback for the case where Root Directory is left unset; if
you can set it, do — it removes an entire class of "detection looked in
the wrong place" failures like the three encountered so far, permanently.

### ⚠️ Required environment variables — a build succeeding does not mean the site works

Everything above gets Vercel to successfully **build** `apps/web`. It says
nothing about whether the deployed site can actually talk to a backend —
and a `next build` that finishes cleanly gives no signal either way, since
`NEXT_PUBLIC_*` values are baked in at build time and used only once a
real visitor's browser runs the code. Two variables are load-bearing and
have no safe production default:

- **`NEXT_PUBLIC_API_BASE_URL`** (Vercel project → Settings → Environment
  Variables, on `apps/web`) must be the real, publicly reachable URL of
  your deployed `apps/api` (e.g. `https://api.stagehome.example.com/api/v1`).
  Leaving this unset means the code falls back to `http://localhost:4000/api/v1`
  — which, baked into a production build, means every visitor's browser
  tries to reach a server on *their own machine*. This fails immediately
  with the browser's generic "Failed to fetch," with no server-side log
  anywhere to explain why, and affects **every** API call the frontend
  makes — registration and login (client-side fetches, so this shows up
  immediately), but also the Universities, Counties, and Search pages
  (Next.js Server Components, which use this exact same URL server-side —
  so those pages don't error, they just always render their empty state,
  looking indistinguishable from "there's genuinely no verified data yet").
  Set this **before** the build you promote to production; changing it
  requires a new deployment, not just an env var edit, because of the
  build-time baking.
- **`WEB_APP_ORIGIN`** (on `apps/api`, wherever you deploy it — Render,
  Railway, Fly.io, ECS) must be the deployed frontend's exact origin
  (`https://your-domain.vercel.app`, comma-separated if you have more than
  one, e.g. a preview + production domain). The API now refuses to boot in
  production if this is unset, specifically because it previously
  defaulted to an empty CORS allow-list — which silently blocks every
  cross-origin request rather than erroring in any visible way.

If registration/login on a deployed StageHome instance fails with "Failed
to fetch", check these two variables first, in this order: (1) open the
browser console on the live site — as of this delivery, `api-client.ts`
logs a specific error naming the exact misconfiguration if the frontend is
still pointed at `localhost`; (2) confirm `NEXT_PUBLIC_API_BASE_URL` is set
in the Vercel dashboard (not just a local `.env`) and redeploy after
setting it; (3) confirm `WEB_APP_ORIGIN` on the API matches the frontend's
real origin exactly (including `https://`, no trailing slash).

## Deploying the frontend to Netlify

Netlify is supported via `netlify.toml` at the repo root. Point your
Netlify site at this repository directly (no need to split the monorepo)
— `netlify.toml`'s `base = "apps/web"` tells Netlify which app to build.

**A real, previously-hit error and its fix:** deploying a Next.js app from
a pnpm monorepo to Netlify commonly fails at runtime with:
```
Runtime.ImportModuleError: Cannot find module 'styled-jsx/style'
```
This happens because `styled-jsx` is a transitive dependency of `next`
itself (used internally even if your app never imports it), and pnpm's
default strict, symlinked `node_modules` layout can hide it from
Netlify's serverless-function bundler, which traces `require()` calls
statically. Three fixes are already applied in this repo, in order of
importance:
1. **`.npmrc`** at the repo root sets `shamefully-hoist=true`, flattening
   `node_modules` into a layout the bundler can trace.
2. **`netlify.toml`** uses the official `@netlify/plugin-nextjs` build
   plugin, required for correct SSR/ISR handling on Netlify at all.
3. **`apps/web/package.json`** declares `styled-jsx` as an explicit direct
   dependency (pinned to `5.1.1`, the exact version Next 14.2.5 bundles
   internally), removing any ambiguity about where it should resolve from.

Verified in this delivery: a fresh `npm install` resolves
`require.resolve('styled-jsx/style')` to a real, top-level path, and the
full `next build` still succeeds with 0 lint errors and all routes
compiling.

**A second real error, and its fix:** *"the publish directory is
incorrectly set to the project root instead of the proper Next.js
output."* This was caused by an earlier version of `netlify.toml`
explicitly setting `publish = ".next"` alongside `base = "apps/web"`.
`@netlify/plugin-nextjs` (v5, the "Next.js Runtime") manages the publish
directory itself as part of its SSR/ISR wiring — it is not a plain static
folder to hand off. Manually overriding `publish` conflicted with the
plugin's own path resolution and caused Netlify to silently fall back to
publishing the repository root. **Fix: `publish` is now correctly left
unset in `netlify.toml`** — let the plugin manage it. Verified: `apps/web/.next`
is produced correctly by a real build, exactly where the plugin (with
`base = "apps/web"`) will look for it.

### ⚠️ If your Netlify site still misbehaves after this fix

**Netlify's dashboard UI build settings take precedence over
`netlify.toml`.** If your Netlify site was ever configured manually — via
Site settings → Build & deploy → Build settings — with its own "Base
directory," "Build command," or "Publish directory" values, **those UI
values override this file entirely**, and no change to `netlify.toml` in
this repository can fix that. This is something only you can check and
clear, since it lives in your Netlify account, not this codebase:
1. Go to your site's **Site settings → Build & deploy → Build settings**.
2. Clear (leave blank) the **Base directory**, **Build command**, and
   **Publish directory** fields if any are manually set.
3. Trigger a fresh deploy (ideally also **clear the build cache** — Deploys
   → Trigger deploy → Clear cache and deploy site) so a stale cached
   dependency tree from a previous failed build isn't reused.

## 2. Configure secrets

Copy `apps/api/.env.example` and `apps/web/.env.example` to `.env` in each
app, and `packages/database/.env.example` similarly. Replace every
`Information Required` placeholder with a real value — see
`ENVIRONMENT_VARIABLES.md` for the full annotated list of what each one
does and which milestone/feature needs it.

Add these to your CI/CD provider's secrets, not to any committed file:
`REGISTRY_USERNAME`, `REGISTRY_PASSWORD`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
`VERCEL_PROJECT_ID`.

## 3. Run the database migration — for the very first time, ever

**This has never been executed from this project's development
environment.** Run it in a disposable/staging environment first:
```bash
cd packages/database
pnpm install
pnpm prisma:generate
pnpm prisma:migrate:deploy   # or prisma:migrate:dev for the first local pass
pnpm prisma:seed             # lookup/taxonomy data only, no business data
```
Then load the audited county data:
```bash
pnpm staging:import:nairobi
pnpm staging:import:kiambu
# ...repeat for every county — see package.json's staging:import:* scripts
pnpm staging:detect-duplicates <batchKey>
```
All imported data lands in the private `staging` Postgres schema, not the
public tables — it stays invisible to the public API until a human
promotes it through the verification workflow (Package/Module 11).

## 4. Deploy

```bash
git push origin main   # triggers .github/workflows/deploy.yml
```
This runs the full test suite first (`pnpm test`), then builds and pushes
Docker images for `api`/`worker`, then deploys `web` to Vercel. It will
fail cleanly if the secrets in step 2 aren't set — this is intentional,
not a bug.

## 5. Post-deploy checklist

Walk `docs/operations/phase1-milestone15-staging-deployment.md`'s full
go/no-go list before real users or real money touch the system: HTTPS
termination, a tested (not just taken) backup restore, real Daraja
sandbox transaction, real SMS/email delivery, Sentry receiving a test
error, and the manual QA checklist in `docs/testing/manual-qa-checklist.md`
walked by a human on a real device.

## 6. Advancing the county rollout

`CURRENT_ACTIVE_ROLLOUT_PHASE` in
`apps/api/src/verification/verification.service.ts` gates which counties'
properties can reach `PUBLISHED`. It is currently `3` (Nairobi, Kiambu,
Nakuru). Advancing it is a one-line, deliberate code change — per Part C
of the original specification, do this one county at a time, with each
advancement being its own explicit decision, not a bulk unlock.
