# Local Development (Docker)

This runs the complete StageHome stack locally: PostgreSQL+PostGIS, Redis,
the FastAPI backend, the Laravel frontend, and the Celery worker scaffold
— all from the exact same Dockerfiles already verified working on
Railway, not a separate, untested local-only setup.

## Prerequisites (Windows)

- [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/), with the **WSL2 backend** enabled (Docker Desktop's default on modern Windows — Settings → General → "Use the WSL 2 based engine").
- Git for Windows, or clone from inside WSL2 directly.
- Real internet access on your machine (needed once, for the first build — see the composer.lock note below).

## One real, honest limitation

This repository does **not** include a `composer.lock` file. The
development sandbox that built this project had no network access to
Packagist and could never run `composer install` itself — see
`apps/web-laravel/MIGRATION_LARAVEL.md` for the full history of that
constraint. The `web` service's Docker build runs `composer install`
fresh on first build, which needs your machine's real internet access
(you have this; that sandbox didn't) and will generate a real,
version-locked `composer.lock` at that point. Commit that file once it
exists if you want reproducible builds going forward — it's intentionally
not faked or hand-written here.

## Quick start

```powershell
# From PowerShell, WSL2, or any terminal in the repo root:
git clone https://github.com/michaeltyler252-design/stagehome.git
cd stagehome
docker compose up --build
```

First build takes several minutes (compiling PHP extensions, installing
Composer and pip dependencies). Subsequent runs are fast — Docker caches
each layer.

Once it's up:

```powershell
# In a second terminal, run migrations against the local database:
docker compose run --rm api-migrate
```

Then open:
- **Frontend**: http://localhost:8080
- **Backend health check**: http://localhost:4000/api/v1/health
- **Backend API docs**: http://localhost:4000/api/v1/docs

## What's running

| Service | Port | Purpose |
|---|---|---|
| `postgres` | 5432 | PostgreSQL 16 + PostGIS + pg_trgm, auto-initialized (`infrastructure/docker/postgres-init.sql`) |
| `redis` | 6379 | Shared by the backend (Celery broker, OTP codes, booking locks) and the frontend (sessions/cache, on a separate Redis DB number for logical separation) |
| `api` | 4000 | FastAPI backend |
| `worker` | — | Celery worker (genuine scaffold — see `apps/worker-py/worker.py`'s own docstring; no real queues registered yet) |
| `web` | 8080 | Laravel frontend (PHP-FPM + Nginx, same production setup verified on Railway) |

## Local environment values

`docker-compose.yml` sets all required environment variables directly —
you don't need to create `.env` files to get the stack running. The
values used (database passwords, JWT secrets, `APP_KEY`) are clearly
local-development-only placeholders, not real secrets — never reuse them
for a real deployment.

If you want to run either app *outside* Docker (e.g. `php artisan serve`
directly, or `uvicorn` directly against your own local Postgres/Redis),
use `apps/api-py/.env.example` and `apps/web-laravel/.env.example` as
your starting points instead.

## Common commands

```powershell
docker compose up --build        # build and start everything
docker compose up -d              # start in the background
docker compose down               # stop everything
docker compose down -v            # stop and wipe the database volume (fresh start)
docker compose logs -f api        # follow backend logs
docker compose logs -f web        # follow frontend logs
docker compose run --rm api-migrate   # run/re-run Alembic migrations
docker compose exec api pytest app/tests/   # run the backend test suite
```

## Troubleshooting on Windows

- **"port already in use"**: something else on your machine is using 5432, 6379, 4000, or 8080. Either stop that process or edit the `ports:` mappings in `docker-compose.yml` (the left-hand side is the port on your machine).
- **Slow builds / file-watching issues**: make sure the repo is cloned *inside* the WSL2 filesystem (e.g. `\\wsl$\Ubuntu\home\you\stagehome`), not on a Windows drive mounted into WSL2 (`/mnt/c/...`) — the latter is significantly slower for Docker builds.
- **Line endings**: already handled — `.gitattributes` forces LF line endings for `*.sh` files regardless of your Git line-ending settings, so `apps/web-laravel/docker/start.sh` won't get corrupted by a Windows checkout.
