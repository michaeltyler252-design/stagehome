# Deployment Guide

This describes how to actually deploy StageHome's current architecture:
a FastAPI backend (`apps/api-py`), a Laravel frontend
(`apps/web-laravel`), a Celery worker (`apps/worker-py`), PostgreSQL, and
Redis. Read `apps/api-py/MIGRATION.md` and
`apps/web-laravel/MIGRATION_LARAVEL.md` first — they document exactly
what has and hasn't been executed/verified in each part of this project.

## 1. Provision infrastructure

- A managed PostgreSQL 16+ instance with the **PostGIS** and **pg_trgm**
  extensions enabled (used by `apps/api-py/app/services/search_service.py`'s
  geospatial radius search and fuzzy-keyword search).
- A managed Redis instance — used by the FastAPI backend for
  booking-hold locks, phone OTP codes, and admin MFA secrets (see
  `apps/api-py/app/core/redis_client.py`), and separately by Celery as
  its broker/backend, and separately again by Laravel for its own
  sessions/cache (three independent uses of Redis; they can share one
  instance with different key prefixes/databases, or be separate
  instances — nothing in the code assumes either).
- A container registry (the CI workflow, `.github/workflows/deploy.yml`,
  pushes to GHCR by default).
- A host for the FastAPI + Celery worker containers — `railway.json` at
  the repo root already targets Railway specifically; `apps/api-py/Dockerfile`
  and `apps/worker-py/Dockerfile` are otherwise generic multi-stage
  builds that work on Render, Fly.io, or ECS too.
- A host for the Laravel frontend — standard Laravel hosting applies
  (Forge, a plain VPS with PHP-FPM + Nginx, Railway's PHP buildpack,
  etc.). **This has never been deployed or even locally booted during
  this project's development** — see the honest disclosure in
  `apps/web-laravel/MIGRATION_LARAVEL.md` for exactly why (the
  development sandbox had no network access to Packagist) and the manual
  steps required before this is possible.

## 2. Deploy the FastAPI backend

Using Railway (already configured via the root `railway.json`):

1. Create a Railway project with `postgres` (postgis/postgis:16-3.4
   image) and `redis` services.
2. Create a service from this GitHub repo; Railway will use the root
   `railway.json`, which points at `apps/api-py/Dockerfile` and runs
   `alembic upgrade head` as the pre-deploy command.
3. Set the environment variables listed in `ENVIRONMENT_VARIABLES.md`'s
   backend section — at minimum `DATABASE_URL`, `REDIS_URL`,
   `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `WEB_APP_ORIGIN` (the
   Laravel frontend's real origin, once deployed).
4. **Before the very first deploy against a database that already has
   real data**, run `alembic stamp head` rather than `alembic upgrade
   head` — see the baseline migration's own docstring
   (`apps/api-py/alembic/versions/0001_baseline.py`) for why.

## 3. Deploy the Celery worker

Same Postgres/Redis, same repo, pointed at `apps/worker-py/Dockerfile`
instead. As of this writing the worker is a genuine scaffold with zero
registered queues (see `apps/worker-py/worker.py`'s own docstring) — it's
safe to deploy, but there's no real background job logic running yet.

## 4. Deploy the Laravel frontend

Not yet exercised end-to-end in this project. The real, required steps:

1. On a machine with normal internet access (unlike this project's
   development sandbox): `composer create-project laravel/laravel:^11.0
   fresh`, then copy `apps/web-laravel/app/`, `routes/web.php`, and
   `resources/views/` onto that fresh skeleton (keep the skeleton's own
   `config/`, `bootstrap/` files; merge in `apps/web-laravel/config/services.php`'s
   one addition).
2. `composer install`, `php artisan key:generate`.
3. Set `STAGEHOME_API_BASE_URL` in `.env` to the deployed FastAPI
   backend's real URL.
4. Deploy via your chosen Laravel host's normal process (`php artisan
   serve` for local testing; Forge/Railway/a VPS with PHP-FPM+Nginx for
   production).
5. Set the FastAPI backend's `WEB_APP_ORIGIN` to this frontend's real
   deployed origin.

## 5. CI/CD

`.github/workflows/ci.yml` runs the FastAPI test suite (58 tests) against
real Postgres+Redis service containers on every push/PR, and lints every
Laravel PHP file for syntax errors. `.github/workflows/deploy.yml`
builds and pushes the FastAPI Docker image on merge to `main`; actual
deployment to your chosen host, and any Laravel deployment step, are
intentionally left as follow-ups requiring host-specific secrets this
repo doesn't assume on your behalf.
