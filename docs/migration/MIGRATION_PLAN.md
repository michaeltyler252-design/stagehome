# StageHome — TypeScript/NestJS → Python/FastAPI Migration Plan

This maps every item in `INVENTORY.md` to its concrete Python implementation.
See `MIGRATION.md` (in the new `apps/api-py` project) for what's actually
been built versus what remains — this document is the *plan*, written
before implementation, not a completion report.

## Target stack

| Concern | Current (TS) | Target (Python) |
|---|---|---|
| Language | TypeScript 5.5 | Python 3.12 |
| Web framework | NestJS 10 (Express) | FastAPI (ASGI, on Uvicorn) |
| ORM | Prisma 5.18 | SQLAlchemy 2.x (`Mapped`/`mapped_column` style) |
| Migrations | Prisma Migrate | Alembic |
| Validation | class-validator/class-transformer DTOs | Pydantic v2 models |
| Auth tokens | `@nestjs/jwt` + passport-jwt | `python-jose` or `PyJWT` |
| Password hashing | `argon2` (npm) | `argon2-cffi` (same algorithm, same hash format — existing password hashes remain valid, no forced reset needed) |
| Google OAuth | `passport-google-oauth20` | `authlib` (Starlette/FastAPI OAuth client) |
| TOTP (admin MFA, OTP) | `otplib` | `pyotp` |
| Background jobs | BullMQ (Node) + ioredis | **Celery** + `redis-py` (as required), with `celery beat` for anything scheduled |
| Redis client | `ioredis` | `redis-py` (async client) |
| Rate limiting | custom Nest guard | `slowapi` (Starlette-native) or a small custom Redis-backed dependency mirroring the existing logic exactly |
| Error monitoring | `@sentry/node` | `sentry-sdk` (official FastAPI integration) |
| API docs | `@nestjs/swagger` | FastAPI's built-in OpenAPI (automatic from Pydantic models + route signatures — arguably less manual annotation than the Nest version) |
| Testing | Jest + Supertest | `pytest` + `httpx.AsyncClient` (FastAPI's own recommended e2e pattern) |
| Package management | pnpm | `uv` (fast, modern, lockfile-based — chosen over plain pip/poetry for speed and Railway-Docker build parity with the existing pnpm workflow) |

## Database migration strategy

**The schema itself does not change.** Postgres, PostGIS, pg_trgm, the
`public`/`staging` two-schema split, every table and column — all stay
exactly as they are. This is a **backend language migration**, not a data
model migration. Concretely:

1. Generate SQLAlchemy models by hand from `schema.prisma`, model-for-model, preserving every field, type, default, and relationship — not via an automatic Prisma→SQLAlchemy converter (none reliably handles Prisma's `multiSchema`/`postgresqlExtensions` preview features), so each model is reviewed against the source schema individually.
2. Point Alembic at the **existing** database with `alembic stamp head` against a migration that matches current state exactly — no destructive migration, no data loss, no re-import of the 88 universities / 16 properties / 3 blog posts already live.
3. Both `public` and `staging` schemas are modeled explicitly via SQLAlchemy's `schema=` argument on each model (mirroring Prisma's `@@schema(...)`).

## Endpoint-by-endpoint mapping

Every endpoint in `INVENTORY.md` §2 keeps its **exact same path, method, and
request/response shape** — this is the explicit requirement, and it's
achievable because FastAPI's routing (`@router.get("/public/counties")`)
maps 1:1 onto Nest's `@Controller()`/`@Get()` pattern. The frontend's
`apps/web/lib/api-client.ts` needs **zero changes** to its URLs; only
`NEXT_PUBLIC_API_BASE_URL` changes (to the new Python service's URL).

| NestJS concept | FastAPI equivalent |
|---|---|
| `@Controller("public")` + `@Get("counties")` | `router = APIRouter(prefix="/public"); @router.get("/counties")` |
| `@Injectable()` service class | Plain class or module-level functions, injected via FastAPI's `Depends()` |
| `PrismaService` (injected DB client) | SQLAlchemy `AsyncSession`, injected via `Depends(get_db)` |
| DTO class + `class-validator` decorators | Pydantic `BaseModel` with field validators |
| `@UseGuards(JwtAuthGuard)` | `Depends(get_current_user)` (a dependency that decodes/validates the JWT, matching `JwtAccessStrategy`'s exact logic) |
| `@Roles("Admin")` + `RolesGuard` | `Depends(require_roles("Admin"))` (a dependency factory) |
| `@CurrentUser()` param decorator | A dependency returning the same `AuthenticatedUser`-shaped object |
| Global `ValidationPipe` (whitelist, forbid unknown props) | Pydantic's default behavior (extra fields rejected via `model_config = ConfigDict(extra="forbid")`) |
| `app.enableCors()` + `isAllowedOrigin()` | Starlette's `CORSMiddleware` with a custom `allow_origin_regex`, or a manual middleware replicating `isAllowedOrigin()` exactly (same explicit-list + `stagehome*.vercel.app` pattern, same tests ported to pytest) |
| `helmet()` | `starlette.middleware` equivalents (secure headers set manually or via `secure` package) — same CSP/HSTS values ported |

## Auth flow migration (byte-for-byte behavior preserved)

- **Register/Login**: same argon2 hash format means **existing user passwords keep working** — no forced password reset for current users.
- **JWT**: same claims shape (`sub`, `email`, `roles`, optional `organisationId`), same 15-min access / 30-day refresh expiry, same SHA-256-hashed refresh-token-in-session-table pattern (ported line-for-line from `auth.service.ts`'s `hashToken()`/`issueSessionTokens()`).
- **Google OAuth**: `authlib`'s FastAPI integration replicates the `/auth/google` → redirect → `/auth/google/callback` flow.
- **Admin MFA / OTP**: `pyotp` is a drop-in conceptual replacement for `otplib` (both are standard TOTP, RFC 6238) — existing provisioned secrets remain valid since the algorithm is identical.

## Background jobs migration

The current worker is a **scaffold with no real queues yet** — this is
actually the easiest part of the migration, since there's no complex,
stateful job logic to port. Celery + `redis-py` replace BullMQ + ioredis
as the queue backend; the four intended-but-unbuilt queues (booking-hold
expiry, payment reconciliation, notification dispatch, media processing)
get built directly as Celery tasks rather than first being built in
BullMQ and then re-ported.

## Testing migration

- Each Jest `describe`/`it` block has a direct `pytest` equivalent (`class Test...` / `def test_...`).
- Mocking `PrismaService` (as most current tests do) becomes mocking the SQLAlchemy session or using `pytest`'s dependency-override mechanism to inject an in-memory/test database session.
- The one real Supertest e2e spec becomes an `httpx.AsyncClient` test against a real (test-database-backed) FastAPI app instance — same behavior, same assertions.

## Deployment migration

- Railway: same project, same Postgres/Redis services (unchanged) — only the API service's Dockerfile changes (Python 3.12 base image, `uv sync`, `uvicorn` as the start command instead of `node dist/main.js`).
- `railway.json`'s `preDeployCommand` changes from `pnpm ...` scripts to `alembic upgrade head` + the equivalent Python seed/import scripts (direct ports of the current `routine-deploy-sync.ts` steps).
- Frontend: **no code changes** beyond `NEXT_PUBLIC_API_BASE_URL` pointing at the new Python service.

## What this plan deliberately does NOT do

- It does not change the database schema, so there's no data migration risk.
- It does not change any frontend code beyond the one environment variable.
- It does not invent new functionality — feature parity is the explicit goal, not feature growth.
