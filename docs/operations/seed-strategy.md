# Seed Strategy

**Milestone:** Phase 1, Milestone 1 — Project Foundation
**Applies to:** `packages/database` (Prisma seed script, `pnpm db:seed`)

## Principle

Part B rule 4 forbids inventing a property, landlord, price, availability
status, review, GPS coordinate, image, video, contact, licence, or university
relationship. The seed script therefore never invents Nairobi business data.
It seeds only two kinds of rows:

1. **Reference/lookup data** that is not business data — property categories,
   unit categories, amenities, utilities, roles, permissions, cancellation
   policy types. These are platform taxonomy, not claims about the real
   world, so they are safe to hard-code.
2. **The audited Nairobi source records**, once Milestone 2 runs the actual
   staging→canonical promotion described in the import staging design — not
   invented placeholder properties.

## What Milestone 1's seed script contains

At the end of Milestone 1, `pnpm db:seed` populates only:

- `roles`: Tenant, Owner, Manager, Accountant, Receptionist, Maintenance,
  Analyst, Admin (Part K)
- `permissions`: a starter set matching each dashboard's listed
  responsibilities (e.g. `properties.write`, `bookings.refund`,
  `verification.approve`)
- `property_categories`: house, hostel, student_residence, bedsitter, studio,
  shared_room, private_room, one_bedroom, two_bedroom, three_bedroom,
  maisonette, serviced_apartment, furnished, unfurnished — the exact list
  from Part A
- `unit_categories`: mirrors the same list at unit level
- `amenities` / `utilities`: the vocabulary observed across Part O's source
  records (kitchen, hot shower, balcony, gym, swimming pool, rooftop, garden,
  study area, parking, wardrobes / water, electricity, fibre internet, Wi-Fi,
  borehole, solar, backup generator, laundry, garbage collection)
- `counties`: all 15 Phase-1-rollout counties from Part C, with
  `rollout_phase` set to their position in that list, `publication_status`
  left at `DRAFT` for every county except the one whose phase is active
- `cancellation_policies`: placeholder policy keys only (no monetary terms —
  those are `Information Required` until Part J's legal/gateway
  confirmation)

## What Milestone 1's seed script deliberately does NOT contain

- Any of the 11 Nairobi properties or universities identified in the
  verification registers. They are real, source-supplied business data and
  belong in the staging-import pipeline (Milestone 2), not a hard-coded seed
  file, so that their full data-quality lifecycle (staging → conflict
  detection → verification → publication) is exercised for real rather than
  bypassed.
- Any user accounts, bookings, payments, or reviews. These require the
  authentication milestone (Milestone 3) to exist meaningfully.
- Any monetary amounts tied to real properties.

## Seed idempotency

The seed script uses `upsert` keyed on each lookup table's natural key (e.g.
`property_categories.key`, `counties.slug`) so it can be re-run safely in any
environment, including CI, without creating duplicates.

## Environments

| Environment | Seed behaviour |
|---|---|
| Local development | Full lookup-table seed, as above |
| CI | Full lookup-table seed, used only to make integration tests deterministic |
| Staging | Full lookup-table seed + the Nairobi staging import (once Milestone 2 is approved) |
| Production | Full lookup-table seed only; property/university data reaches production exclusively through the verified promotion pipeline, never a seed script |
