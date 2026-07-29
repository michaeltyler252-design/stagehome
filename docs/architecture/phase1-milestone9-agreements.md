# Phase 1 — Nairobi City — Milestone 9: Agreements and Signatures

## Built

- `AgreementsService.generate()` — only for `CONFIRMED` bookings (payment
  already succeeded). Renders a tenancy agreement (built-in default
  template; a manager's own `tenancy_templates` row is the natural
  extension point, not yet wired into generation), computes a SHA-256
  `documentHash` on the exact rendered text, creates `AgreementVersion` 1,
  and issues one `SignatureRequest` per signatory (tenant + the property's
  organisation) with its own random, expiring (`14 days`) authenticated
  token — Part I's "authenticated signing links," literally: the token is
  the only credential a signatory needs, no login required.
- `AgreementsService.getByToken()` / `.sign()` — token-authenticated,
  publicly reachable (no `JwtAuthGuard`) since a signatory reaches this from
  a link, not a session. Every view and every signature writes a
  `SignatureEvent` (viewed / consented / signed) with an IP address and
  timestamp — the audit evidence Part I requires.
- **Sealing:** once every signatory has signed, the agreement flips to
  `FULLY_SIGNED` and a `SignedDocument` is created. From that point,
  `generate()` refuses outright to touch that booking's agreement again —
  "no silent post-signing replacement" is a hard guard in code, tested
  directly, not just a comment.

## Honest gaps

- **No real PDF rendering or object storage yet.** `bodyStorageKey` /
  `SignedDocument.storageKey` point at conceptual keys
  (`agreements/{id}/sealed.pdf`) the same way `Media.storageKey` has since
  Milestone 4 — actual PDF generation + S3/R2 upload is real work that
  depends on the same `Information Required` storage credentials as photos.
- **No e-signature provider integration** (Part D lists one as an option).
  What's built here is a legitimate, self-hosted signing-link mechanism —
  document hash, timestamped consent events, sealed state — which is
  probably sufficient for an MVP, but isn't DocuSign/HelloSign-equivalent
  and should be reviewed by whoever handles the legal side before Nairobi's
  agreements are relied on in a real dispute.
- **Custom per-organisation templates aren't wired in yet** — `generate()`
  always uses the built-in default. The `tenancy_templates` table and
  `renderTemplate()` helper exist for this; connecting them is a small
  follow-up, not a redesign.

## Tests

**105 backend tests passing** (12 new — including the two most load-bearing
ones: "refuses to regenerate an agreement once FULLY_SIGNED" and "seals
correctly only once the *last* signatory signs, not before"). Backend
typecheck clean.

## Exact next milestone

Phase 1, Milestone 10: Notifications and support (email/SMS/WhatsApp
dispatch for booking/payment/agreement/move-in events, support ticket
priorities P0–P4) — blocked on real email/SMS/WhatsApp provider credentials,
all still `Information Required`.

## Approval gate

Stopping here per Part B rule 12.
