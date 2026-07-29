# Environment Variables Reference

The authoritative, copy-pasteable files are `apps/api/.env.example`,
`apps/web/.env.example`, and `packages/database/.env.example`. This
document is an annotated index of what each variable does and, critically,
**which ones must be real before a given feature works**.

## Already safe to use as-is (no action needed)
`NODE_ENV`, `API_PORT`, `DATABASE_URL` (dev default), `REDIS_URL` (dev
default), `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `NEXT_PUBLIC_SITE_URL`,
`LOG_LEVEL`.

## Must be replaced before deploying to production
| Variable | File | Why |
|---|---|---|
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | api | Dev placeholders — generate fresh random secrets |
| `NEXTAUTH_SECRET` | web | Same |
| `DATABASE_URL`, `REDIS_URL` | api/database | Point at your real managed instances |
| `WEB_APP_ORIGIN` | api | **Critical, previously mis-documented here as "safe to use as-is" — it is not.** This must be the deployed frontend's exact origin (e.g. `https://stagehome.vercel.app`, comma-separated if more than one). Its dev default only works for `localhost:3000`. Left unset, the API now refuses to boot in production rather than silently defaulting to an empty CORS allow-list — the previous silent-empty-list behavior blocked every cross-origin request from the real frontend (registration, login, everything) with the browser's generic, undiagnosable "Failed to fetch," with nothing in the API's own logs to explain why. |
| `NEXT_PUBLIC_API_BASE_URL` | web | **Critical, same previous mis-documentation.** Must be the deployed API's real, publicly reachable URL (e.g. `https://api.stagehome.example.com/api/v1`). This is a Next.js **build-time** value — setting it only in a local `.env` does nothing for a Vercel deployment; it must be set in the Vercel project's own Environment Variables before the build that ships to production. Left at its `localhost:4000` dev default, the deployed site's browser JS tries to reach a server on each visitor's own machine, which always fails with "Failed to fetch" — this is very likely why registration (and, less obviously, the Universities/Counties/Search pages, since Next.js Server Components use the exact same URL for their own server-side fetches) failed on a real deployment. The web app now logs a specific console error identifying this exact misconfiguration if it detects it at runtime (see `apps/web/lib/api-client.ts`).

## Required for specific features — safe to leave as `Information Required` until you build that feature
| Feature | Variables | File |
|---|---|---|
| Google sign-in | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_CALLBACK_URL` | api, web |
| Phone OTP SMS delivery | `OTP_PROVIDER_API_KEY` | api |
| Media/photo uploads | `MEDIA_STORAGE_PROVIDER`, `MEDIA_STORAGE_BUCKET`, `MEDIA_STORAGE_REGION`, `MEDIA_STORAGE_ACCESS_KEY_ID`, `MEDIA_STORAGE_SECRET_ACCESS_KEY`, `MEDIA_CDN_BASE_URL` | api |
| Maps / geocoding | `MAPS_PROVIDER`, `MAPS_API_KEY`, `NEXT_PUBLIC_MAPS_PROVIDER`, `NEXT_PUBLIC_MAPS_API_KEY` | api, web |
| M-Pesa payments | `DARAJA_CONSUMER_KEY`, `DARAJA_CONSUMER_SECRET`, `DARAJA_PASSKEY`, `DARAJA_SHORTCODE`, `DARAJA_ENV` | api |
| Card payments | `CARD_GATEWAY_PUBLIC_KEY`, `CARD_GATEWAY_SECRET_KEY` | api *(not yet implemented in code — only M-Pesa STK is built)* |
| Airtel Money | `AIRTEL_MONEY_CLIENT_ID`, `AIRTEL_MONEY_CLIENT_SECRET` | api *(not yet implemented in code)* |
| E-signature (external provider) | `ESIGNATURE_PROVIDER`, `ESIGNATURE_API_KEY` | api *(the built-in signing-link mechanism works without these — see Package 12's README)* |
| Email notifications | `EMAIL_PROVIDER_API_KEY` | api |
| SMS notifications | `SMS_PROVIDER_API_KEY` | api |
| WhatsApp notifications | `WHATSAPP_BUSINESS_TOKEN`, `WHATSAPP_BUSINESS_PHONE_ID` | api |
| Error tracking | `SENTRY_DSN` | api |
| Analytics | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | web |

## What happens if you deploy without setting these
Every optional integration listed above is built to **refuse cleanly with
a clear error** when called without real credentials — none of them
silently pretend to succeed (see each service's own `__tests__/*.spec.ts`
for the "refuses when unconfigured" cases). `WEB_APP_ORIGIN` now follows
the same rule: the API refuses to boot in production if it's unset, rather
than starting up looking healthy while silently blocking every real
request. `NEXT_PUBLIC_API_BASE_URL` can't be checked at boot the same way
— it's baked into the frontend at build time — so the web app instead logs
a specific, actionable console error at runtime if it detects it's still
pointed at `localhost` while running on a real deployed origin.
