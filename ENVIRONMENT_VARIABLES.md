# Environment Variables Reference

The authoritative, copy-pasteable files are `apps/api-py/.env.example`
(FastAPI backend) and `apps/web-laravel/.env.example` (Laravel frontend).
This document is an annotated index of what each variable does and,
critically, **which ones must be real before a given feature works**.

## Backend (`apps/api-py`)

### Already safe to use as-is for local development
`NODE_ENV`, `API_PORT`, `DATABASE_URL` (dev default), `REDIS_URL` (dev
default), `LOG_LEVEL`.

### Must be replaced before deploying to production
| Variable | Why |
|---|---|
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Dev placeholders — generate fresh random secrets |
| `DATABASE_URL`, `REDIS_URL` | Point at your real managed Postgres/Redis instances |
| `WEB_APP_ORIGIN` | **Critical.** Must be the deployed Laravel frontend's exact origin. The API refuses to boot in production if this is unset — it will not silently default to an empty CORS allow-list, which would otherwise block every request from the real frontend with an undiagnosable "Failed to fetch" and nothing in the logs to explain why. |

### Required for specific features — safe to leave blank until you build that feature
Every one of these is coded to refuse clearly (usually HTTP 503 with a
message naming the missing variable) rather than silently fail or fake
success when left unset — verified by actually triggering each refusal
path in this project's test suite and, for several, by live execution
against a real database this session.

| Feature | Variables |
|---|---|
| Google sign-in | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` |
| M-Pesa payments | `DARAJA_CONSUMER_KEY`, `DARAJA_CONSUMER_SECRET`, `DARAJA_PASSKEY`, `DARAJA_SHORTCODE`, `DARAJA_ENV` |
| Email notifications | `EMAIL_PROVIDER_API_KEY` |
| SMS notifications (also used for OTP delivery) | `SMS_PROVIDER_API_KEY` |
| WhatsApp notifications | `WHATSAPP_BUSINESS_TOKEN` |
| Error tracking | `SENTRY_DSN` |

## Frontend (`apps/web-laravel`)

| Variable | Why |
|---|---|
| `APP_KEY` | Generate via `php artisan key:generate` — required for session encryption |
| `STAGEHOME_API_BASE_URL` | The FastAPI backend's real, publicly reachable base URL (e.g. `https://api.stagehome.example.com/api/v1`). Laravel never connects to PostgreSQL directly — every page fetches through this one HTTP client (`App\Services\StageHomeApiClient`). |
| `SESSION_DRIVER`, `CACHE_STORE`, `REDIS_HOST`, `REDIS_PORT` | Laravel's own Redis connection, for its own sessions/cache — independent of the backend's `REDIS_URL`. No state is shared between the two; the API remains the single source of truth for all application data. |

## What happens if you deploy without setting the optional backend variables
Every optional integration above refuses cleanly with a clear error
naming the missing variable, rather than silently failing, crashing, or
faking a successful response. This was verified for several of them
(Daraja, admin MFA setup, phone OTP) by actually triggering the code
path against a real local Postgres+Redis instance during this project's
verification work — see `apps/api-py/MIGRATION.md` for exactly which
paths were executed versus which remain untested due to needing real
third-party credentials.
