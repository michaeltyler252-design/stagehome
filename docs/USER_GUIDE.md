# User Guide — StageHome

This describes what's actually built and working today, not an aspirational
feature list. Anything not mentioned here isn't live yet.

## For students (tenants)

1. **Browse** — visit the homepage, browse by county (`/counties`) or
   university (`/universities`), or search directly (`/search`) with
   filters: keyword, property type, rent range, and sort order (nearest,
   lowest/highest rent, newest, highest rated, most reviewed, available
   soonest).
2. **View a listing** — every property page shows photos (once uploaded),
   rent, deposit, house rules, amenities, and distance to campus. A green
   "Verified" stamp only appears on listings that have actually passed
   verification.
3. **Sign up / sign in** — `/sign-up` (email + phone + password) or
   `/sign-in` (password or phone OTP). Google sign-in is built but needs
   real credentials configured by the platform operator first.
4. **Reserve a unit** — from a property page, "Reserve this unit" walks
   you through quote → hold → confirm automatically. Your reservation
   holds the unit for 15 minutes while you complete it, so someone else
   can't grab it from under you.
5. **Pay** — once your booking is confirmed, an M-Pesa STK push is sent to
   your phone (once the platform operator has configured real Daraja
   credentials — this is not yet live in every deployment).
6. **Track your bookings** — `/account/bookings` shows every booking's
   payment and agreement status in one place.
7. **Sign your tenancy agreement** — once your booking is fully paid,
   you'll receive a signing link (by email/SMS once those are configured)
   to review and sign your agreement.

## For property managers (landlords)

1. **Sign up**, then go to `/manager/properties`.
2. **Create your organisation** — properties belong to an organisation,
   not to you personally, so you can add staff (Accountant, Receptionist,
   Maintenance) later with their own scoped access.
3. **Add a property** — `/manager/properties/new`. It starts as a private
   draft; nothing you add is visible to renters yet.
4. **Submit for verification** — once your listing is ready, click "Submit
   for verification" from your properties table. StageHome's team
   confirms your identity, your property's details, and its location
   before anything goes live.
5. **Track status** — your properties table shows DRAFT → REVIEW →
   APPROVED → PUBLISHED at a glance.

## For StageHome admins

1. **Verification queue** — `/admin/verification` shows every property
   waiting on review, with live counts (queue size, flagged conflicts,
   users, refunds awaiting dual-control approval).
2. **Approve or reject** — Approve is disabled automatically on any
   listing with an unresolved data conflict (e.g., two records that might
   be duplicates of each other) until a human resolves it.
3. **Refunds above KES 50,000** require a second admin's approval — the
   person who requested a refund cannot approve their own request.

## What's real vs. what's configured but inactive

Every third-party integration (M-Pesa, SMS, email, WhatsApp, Google
sign-in, Maps, error tracking) is built to refuse cleanly rather than fake
success when its credentials aren't configured. If you're testing a fresh
deployment and something like OTP delivery or payment doesn't work, check
whether the corresponding `Information Required` placeholder in `.env` has
been replaced with a real credential yet — see
`docs/operations/phase1-milestone15-staging-deployment.md` for the full
list.

## Verified vs. unverified data

Every county's property data currently in the system came from a source
document, not a live manager. It is marked `SOURCE_SUPPLIED_UNVERIFIED`
and stays private (`DRAFT`) until a human on StageHome's team confirms it —
see `docs/data-quality/` for the exact, per-county status of what's been
checked and what hasn't.
