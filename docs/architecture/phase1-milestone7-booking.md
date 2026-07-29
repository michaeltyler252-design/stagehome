# Phase 1 — Nairobi City — Milestone 7: Booking System

## Built

- `BookingsService`: quote → hold → confirm → cancel, matching Part I's
  booking workflow.
  - **Double-booking prevention:** `createHold` takes a Redis lock with
    `SET key value PX <ttl> NX` — atomic acquire, no check-then-set race
    condition. A second renter trying to hold the same unit gets a
    `ConflictException`, not a silently overwritten reservation.
  - **Policy freezing:** `confirmBooking` copies the property's house rules
    and deposit policy into `booking.policySnapshotJson` at the exact moment
    of confirmation — the literal mechanism behind Part K's "prevent
    managers from retrospectively changing confirmed booking prices or
    policy snapshots."
  - Bookings only ever quote units on `PUBLISHED` properties (Part B rule 8
    enforced at the booking layer too, not just search).
  - Ends at `PENDING_PAYMENT`, not `CONFIRMED` — actual payment collection is
    Milestone 8, which doesn't exist yet, so nothing here pretends a booking
    is paid when it isn't.
- Frontend: `ReserveButton` on the property page drives the real
  quote→hold→confirm flow against the live API.

## Known limitation, flagged in code

The Redis hold lock is released the moment a booking is confirmed, not kept
until payment succeeds or times out. A proper "release the unit if payment
isn't completed within N minutes" job belongs in `apps/worker` (BullMQ) and
is Milestone 8 scope, once there's an actual payment provider to time out
against. Documented directly in `BookingsService.confirmBooking`.

## Tests

**75 backend tests passing** (14 new, including the specific test I'd call
the most important one in this batch: `createHold` throws `ConflictException`
and never creates a hold when the Redis `NX` lock is already taken — that's
the double-booking bug this whole mechanism exists to prevent, and it's now
asserted, not just assumed). Backend + frontend typecheck clean. Frontend
production build: 14/14 routes compile.

## Exact next milestone

Phase 1, Milestone 8: Payment system (M-Pesa Daraja STK Push, callback
verification, idempotency, ledger) — blocked on real Daraja sandbox
credentials, which are still `Information Required`.

## Approval gate

Stopping here per Part B rule 12.
