# Manual QA Checklist — Phase 1, Milestone 14

Everything in this document requires a live database, live Redis, and/or
real third-party credentials — none of which this sandbox has access to
(see every prior milestone report's "known limitation" section). This is a
runbook for whoever runs it in a real environment, not a substitute for
that run.

## Before you start

```bash
pnpm install
pnpm docker:up
pnpm db:generate
pnpm db:migrate:dev --name init
pnpm db:seed
pnpm --filter @student-housing/database staging:import:nairobi
pnpm dev
```

## End-to-end flows to walk manually

- [ ] **Sign-up → sign-in → sign-out.** Confirm the JWT in the browser's
      sessionStorage actually expires after 15 minutes and `/auth/refresh`
      transparently renews it.
- [ ] **Phone OTP sign-in**, with `OTP_PROVIDER_API_KEY` left unset. Confirm
      the code appears in the API's server console (dev-mode fallback) and
      that the same flow refuses cleanly if `NODE_ENV=production`.
- [ ] **Google OAuth**, once real `GOOGLE_OAUTH_CLIENT_ID`/`SECRET` are
      configured. This has never been exercised against a real Google
      account in any environment so far.
- [ ] **Manager flow end-to-end:** create organisation → create property →
      add a unit → submit for verification → (as Admin) approve → publish
      → confirm it now appears on `/search` and the property detail page.
- [ ] **The Station View Residency conflict specifically:** confirm the
      admin verification queue shows it FLAGGED and that clicking Approve
      is disabled, exactly as designed.
- [ ] **Booking double-booking test:** open two browser sessions as two
      different tenants, both request a hold on the same unit within the
      15-minute window. Confirm the second one gets a 409, not a second
      successful hold.
- [ ] **Payment, with real Daraja sandbox credentials:** initiate an STK
      push, complete it on a real Safaricom sandbox test number, confirm
      the callback fires, the booking moves to CONFIRMED, and the tenant
      receives (in dev-mode log, or really if email/SMS are configured) a
      receipt notification.
- [ ] **Payment idempotency in practice:** retry the same initiate-payment
      request with the same `idempotencyKey` while the first is still
      pending — confirm no second STK push is sent.
- [ ] **Agreement signing, both parties:** confirm the tenant's signing
      link email/SMS actually arrives (once real providers are configured)
      and that signing moves the agreement through PARTIALLY_SIGNED to
      FULLY_SIGNED correctly with two different signatories.
- [ ] **Refund dual control in practice:** as Admin A, request a refund
      ≥ KES 50,000. Confirm Admin A cannot approve it themselves (403), and
      that Admin B can.
- [ ] **Rate limiting in practice:** hit `/auth/login` 11 times in under 15
      minutes from the same IP with wrong credentials, confirm the 11th
      returns 429 and a `security_events` row was written.

## Cross-browser / cross-device (not verifiable in this sandbox at all)

- [ ] Mobile Safari (iOS) and Chrome (Android) — the primary expected
      devices for this audience. Layout has been built mobile-first with
      Tailwind's responsive utilities throughout, but has never rendered in
      an actual mobile browser.
- [ ] Screen reader pass (VoiceOver/TalkBack) — semantic HTML, labels, and
      focus-visible states are in place (see Milestone 12), but no actual
      screen-reader session has been run.
- [ ] Real network conditions — Kenyan mobile data speeds vary widely;
      Next.js's automatic code-splitting and the deliberately light design
      (no heavy JS libraries in the public pages) should help, but this is
      unverified without real device/network testing.

## Load / performance (not verifiable in this sandbox at all)

- [ ] Concurrent booking-hold load test — the Redis `SET NX` lock should
      hold under concurrency, but has only been tested with mocked Redis,
      never a real Redis instance under load.
- [ ] Database query performance once Nairobi's real inventory is larger
      than a handful of properties — several dashboard/search queries
      (`groupBy`, in-memory sorts in `SearchService`) were written for
      correctness, not yet profiled for scale.

## What this milestone DID verify automatically (not manual)

166 backend unit tests (up from 140 last milestone — added `RolesGuard`,
`OtpService`, and `EmailClient`/`SmsClient`/`WhatsAppClient` tests, all of
which had zero or partial coverage before this pass), 0 ESLint errors on
either app (2 real ones found and fixed — unescaped JSX apostrophes), a
full internal-link audit (every `href` cross-checked against real routes —
0 broken links found), and a full production build of all 20 frontend
routes.
