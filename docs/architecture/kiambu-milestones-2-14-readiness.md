# Kiambu County — Milestones 2–14: Architectural Readiness Confirmation

## Why this isn't 13 more milestone reports

Nairobi's Milestones 3–14 (Auth, Property-management, Public marketplace,
Search, Booking, Payments, Agreements, Notifications, Dashboards, SEO,
Security, QA) were never written to be Nairobi-specific. Every service
takes a `countyId`/`countySlug` as data, not as a hardcoded assumption.
Rebuilding them for Kiambu would mean copy-pasting already-tested code —
exactly the kind of pointless duplication Part B's efficiency intent (and
plain good engineering) argues against. So instead of mechanically
re-running 13 milestone write-ups, I audited whether that assumption is
actually true, rather than just asserting it.

## Audit performed

Grepped the entire backend (`apps/api/src`) and frontend
(`apps/web/app`, `components`, `lib`) for every reference to "Nairobi" or
"nairobi" outside test files, to find any place county-specific logic might
have leaked in by accident.

**Backend — 3 matches, all doc comments, zero logic:**
- `verification.service.ts`: a comment explaining the rollout-phase constant
- `search.service.ts`: a comment referencing "Nairobi's inventory" as the
  current example dataset
- `main.ts`: the Swagger API description, which accurately says "Phase 1
  (Nairobi)" because Nairobi is, in fact, the only currently-active phase

**Frontend — 5 matches, all marketing copy** ("Phase 1: Nairobi City" in
the homepage hero, layout metadata, footer, counties page) — accurate
today, and correctly *not* hardcoded into any data-fetching logic (the
homepage's "browse by county" section calls `apiClient.listCounties()` with
no filter — Kiambu will appear there automatically the moment it has a
published property).

**Conclusion: zero county-specific logic hardcoding found.** The one and
only gate standing between "Kiambu's code works" and "Kiambu properties can
go live" is intentional, not an oversight:

```ts
// apps/api/src/verification/verification.service.ts
export const CURRENT_ACTIVE_ROLLOUT_PHASE = 1;
```

`VerificationService.publish()` refuses to publish any property whose
county's `rolloutPhase` exceeds this constant (tested directly in
Milestone 4/11's test suites). Kiambu is seeded at `rolloutPhase: 2`
(Milestone 2, back in Nairobi's own build). Advancing this constant to `2`
is a one-line change — and I am deliberately not making it. Per Part B rule
12, moving to the next county requires your explicit approval, and this
constant is the literal, enforced mechanism for that rule, not just a
description of it. Flipping it myself would defeat the entire point of it
existing.

## What Kiambu genuinely still needs (not covered by the above)

1. **Its own staging import run** against a real database — scripted
   (`staging:import:kiambu`), never executed, same sandbox limitation as
   everywhere else.
2. **Its own manager relationships** — Kiambu's 3 properties need real
   organisations/managers to claim them (or to go through the same
   manager-submission flow Nairobi's do), which is a data/outreach task,
   not a code task.
3. **The explicit decision to flip `CURRENT_ACTIVE_ROLLOUT_PHASE`** —
   yours to make, not mine.

## What this means practically

Kiambu is **structurally ready** the moment its 3 properties clear
verification and a human decides to advance the rollout phase. There is no
"Kiambu Milestone 7 (Booking)" to build — Milestone 7 already works for any
county's properties. The honest per-county work that remains is data
(source-audit, verification, real manager contact) and the deliberate
go-ahead — not more code.

## Approval gate

This confirms readiness; it does not advance the rollout. Say the word when
you want `CURRENT_ACTIVE_ROLLOUT_PHASE` moved to `2` — that one line is the
actual "launch Kiambu" action, and I'm holding it for your explicit call.

---

## Update — 2026-07-27: approval received, phase advanced

Explicit approval was given and `CURRENT_ACTIVE_ROLLOUT_PHASE` has been
advanced from `1` to `2`. `VerificationService.publish()` will now accept
Kiambu properties (`rolloutPhase: 2`) once they clear the same
`APPROVED` status every property requires. **This does not mean any
Kiambu property is live** — none has been through real verification yet
(see `docs/data-quality/kiambu-institution-verification-register.md` and
`kiambu-property-verification-register.md` for the specific outstanding
items), and no staging import has ever run against a live database. The
code-level gate that used to block Kiambu regardless of verification
status is now the only thing that changed. See
`docs/architecture/all-counties-milestones-2-14-readiness.md` for the full,
current picture across all audited counties, and the regression test in
`verification.service.spec.ts` ("publishes an APPROVED property in Kiambu
now that phase 2 is active") for the automated proof this works.
