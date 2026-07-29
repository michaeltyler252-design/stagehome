# Phase 1 — Nairobi City — Milestone 8: Payment System

## Built

- `DarajaClient`: isolated M-Pesa STK push wrapper. Refuses cleanly
  (`ServiceUnavailableException`) when `DARAJA_CONSUMER_KEY` is unset or
  still the literal `Information Required` placeholder — same honesty
  pattern as `OtpService`. When real credentials exist, it does a genuine
  OAuth token fetch then a genuine STK push call against Safaricom's public
  sandbox/production hosts.
- `PaymentsService`:
  - **Idempotent initiation** — a client-supplied `idempotencyKey` returns
    the original payment on retry instead of double-charging (Part J).
  - **Replay-safe callback handling** — `payment_callbacks.providerRef` is
    unique; a duplicate Daraja callback (which Daraja is known to send) is
    recorded but never reprocessed, so a booking can't get double-confirmed
    or double-ledgered.
  - **Payment confirmation only ever happens from the callback**, never a
    browser redirect — Part B rule 11 enforced structurally, not just by
    convention: there is no code path in this module that marks a payment
    `SUCCEEDED` from anywhere except `handleCallback`.
  - **Real double-entry ledger** — every successful payment posts a
    balanced debit (M-Pesa Clearing, asset) and credit (Rent Revenue); this
    is asserted directly in tests (`totalDebits === totalCredits`), not
    just implemented and hoped correct.
  - **Refund dual control** — refunds at or above KES 50,000 are flagged
    `requiresDualControl: true` and stop there; a second-approval action is
    explicitly deferred to Milestone 13, not faked as already handled.
  - Booking only moves to `CONFIRMED` once every installment is paid — a
    partial payment on a multi-installment plan correctly leaves the
    booking in `PENDING_PAYMENT` (tested).

## What's still `Information Required`

Real Daraja sandbox credentials, a card gateway, and Airtel Money enablement
— none of which exist yet. Everything built against them refuses safely
rather than pretending to work. Card-hosted-checkout and Airtel Money are
**not implemented at all** in this milestone — only M-Pesa STK, which the
spec (Part D) lists first and which is the dominant payment method for this
market. Recommend treating card/Airtel as a follow-up sub-milestone once
Daraja is proven end-to-end.

## Tests

**93 backend tests passing** (18 new — including the two I'd flag as most
important: the ledger-balances assertion, and the "second callback for the
same CheckoutRequestID is a no-op" replay test). Backend typecheck clean.

## Exact next milestone

Phase 1, Milestone 9: Agreements and signatures (tenancy agreement
generation from `tenancy_templates`, e-signature integration — also blocked
on a real e-signature provider, `Information Required`).

## Approval gate

Stopping here per Part B rule 12.
