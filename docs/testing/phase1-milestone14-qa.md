# Phase 1 — Nairobi City — Milestone 14: QA

This milestone ran a coverage review, a lint pass, and a link audit across
the whole codebase — and found real gaps, not just confirmed clean ones.

## Finding 1: `RolesGuard` had zero direct tests

The single component enforcing RBAC across the entire API — every
`@Roles()`-guarded route in Properties, Verification, Payments, Support,
Dashboards — had no dedicated test file. Coverage report showed 0% branch
coverage on it. **Fixed:** 7 new tests covering every branch (no metadata →
allow, empty roles → allow, no user → forbid, wrong role → forbid, multiple
required roles, multiple held roles, Admin-only route).

## Finding 2: `OtpService` had zero tests at all

A security-relevant component — OTP generation, hashed storage, 5-attempt
lockout, verification — had never been unit tested, in any milestone.
**Fixed:** 8 new tests, including the two that matter most: the lockout
actually locks out after 5 wrong guesses, and a correct guess clears the
stored hash (so it can't be replayed).

## Finding 3: a real test-authoring bug, caught by the tests themselves

`EmailClient`/`SmsClient`/`WhatsAppClient` tests for the "refuses in
production" branch initially **failed** — not because the code was wrong,
but because `new ConfigService({ NODE_ENV: "production" })` doesn't work
the way it looks like it should: `@nestjs/config`'s real `ConfigService`
prioritises `process.env` over its constructor argument, and Jest sets
`process.env.NODE_ENV=test` globally. The tests were silently exercising
the *development* branch every time, not the *production* one they claimed
to. Fixed by stubbing `ConfigService.get()` directly instead of
constructing a real one — a small thing, but exactly the kind of bug that
makes a test suite lie about what it covers.

## Finding 4 (frontend): 2 real ESLint errors

`next lint` (which includes accessibility linting via
`eslint-plugin-jsx-a11y`) found two unescaped apostrophes in JSX text
(`how-it-works` and `sign-up` pages) — `react/no-unescaped-entities`. Small,
but real, and now fixed. No accessibility-rule violations were found beyond
that.

## Finding 5: none — link audit came back clean

Cross-checked every static `href` and every dynamic `href={\`/…/${slug}\`}`
in the frontend against actual defined routes. **Zero broken links.**

## Coverage improvement

| Metric | Before this milestone | After |
|---|---|---|
| Statements | 81.25% | — |
| Branches | 65.64% | 74.14% |
| Functions | 51.51% | 56.27% |
| Lines | 79.74% | 85.5% |
| Test count | 140 | **166** |

## Dependency/lint/build verification performed

- `npx tsc --noEmit` — clean, both apps.
- `npx eslint` (backend) — 1 warning found and fixed (unused import).
- `npx next lint` (frontend) — 2 errors found and fixed.
- Full `next build` — 20/20 routes compile.
- Full backend test suite — 166/166 passing, including the DI-graph
  compilation test.

## What QA could NOT verify in this sandbox

See `docs/testing/manual-qa-checklist.md` — every item there needs a live
database, live Redis, real third-party credentials, a real browser, a real
mobile device, or real concurrent load, none of which exist here. This is
handed off as a checklist, not silently skipped.

## Exact next milestone

Phase 1, Milestone 15: Staging deployment (the final milestone for Nairobi
Phase 1) — provisioning managed Postgres/Redis, actually running the
migration this sandbox has never been able to run, deploying both apps, and
a go/no-go checklist before Nairobi is considered launch-ready.

## Approval gate

Stopping here per Part B rule 12.
