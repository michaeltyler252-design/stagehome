# API Documentation — StageHome / Kenyan Student Housing Marketplace

All endpoints are prefixed `/api/v1`. Live, interactive Swagger docs are
also generated automatically at `/api/v1/docs` whenever the API is
running (`SwaggerModule` is wired in `apps/api/src/main.ts`) — this file is
a static reference for browsing without running the server.

Auth: 🔓 public · 🔑 requires a valid access token · 🛡️ requires a specific role (noted)

## Auth (`/auth`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | 🔓 | Rate-limited 5/hour/IP |
| POST | `/auth/login` | 🔓 | Rate-limited 10/15min/IP |
| POST | `/auth/otp/request` | 🔓 | Rate-limited 3/15min/IP |
| POST | `/auth/otp/verify` | 🔓 | Rate-limited 10/15min/IP |
| POST | `/auth/refresh` | 🔓 | Rotates the session |
| POST | `/auth/logout` | 🔓 | |
| GET | `/auth/google` | 🔓 | Redirects to Google (needs real OAuth creds) |
| GET | `/auth/google/callback` | 🔓 | |
| POST | `/auth/admin-mfa/setup` | 🛡️ Admin | TOTP secret issuance |
| POST | `/auth/admin-mfa/verify` | 🛡️ Admin | |

## Organisations (`/organisations`)
| Method | Path | Auth |
|---|---|---|
| POST | `/organisations` | 🔑 |
| GET | `/organisations/mine` | 🔑 |

## Properties (`/organisations/:id/properties`, `/properties`)
| Method | Path | Auth |
|---|---|---|
| POST | `/organisations/:organisationId/properties` | 🛡️ Owner/Manager/Admin |
| GET | `/organisations/:organisationId/properties` | 🛡️ Owner/Manager/Admin |
| GET | `/properties/:propertyId` | 🛡️ Owner/Manager/Admin |
| PATCH | `/properties/:propertyId` | 🛡️ Owner/Manager/Admin |
| POST | `/properties/:propertyId/submit-for-verification` | 🛡️ Owner/Manager/Admin |
| POST | `/properties/:propertyId/units` | 🛡️ Owner/Manager/Admin |

## Verification (`/admin/verification`) — Admin only
| Method | Path |
|---|---|
| GET | `/admin/verification/queue` |
| POST | `/admin/verification/properties/:id/approve` |
| POST | `/admin/verification/properties/:id/publish` |
| POST | `/admin/verification/properties/:id/reject` |

## Search & Public (`/public`) — all 🔓, all scoped to `publicationStatus: PUBLISHED`
| Method | Path |
|---|---|
| GET | `/public/counties` |
| GET | `/public/counties/:slug` |
| GET | `/public/universities?county=` |
| GET | `/public/universities/:slug` |
| GET | `/public/properties?countySlug=&universitySlug=&categoryKey=&minRent=&maxRent=&keyword=&sort=&lat=&lng=&radiusKm=&swLat=&swLng=&neLat=&neLng=&maxWalkingMinutes=&page=&limit=` |
| GET | `/public/properties/:slug` |

## Bookings
| Method | Path | Auth |
|---|---|---|
| POST | `/units/:unitId/quotes` | 🔑 |
| POST | `/quotes/:quoteId/hold` | 🔑 |
| POST | `/holds/:holdId/confirm` | 🔑 |
| POST | `/bookings/:bookingId/cancel` | 🔑 |
| GET | `/bookings/mine` | 🔑 |

## Payments
| Method | Path | Auth |
|---|---|---|
| POST | `/payments/initiate` | 🔑 |
| POST | `/payments/callback/mpesa` | 🔓 (Daraja webhook — never trust for anything other than SUCCEEDED confirmation) |
| POST | `/payments/:paymentId/refund` | 🛡️ Admin/Accountant |
| POST | `/payments/refunds/:refundId/approve` | 🛡️ Admin (dual control: cannot be the requester) |

## Agreements
| Method | Path | Auth |
|---|---|---|
| POST | `/bookings/:bookingId/agreements` | 🔑 |
| GET | `/agreements/sign/:token` | 🔓 (token itself is the auth) |
| POST | `/agreements/sign/:token` | 🔓 |

## Notifications
| Method | Path | Auth |
|---|---|---|
| GET | `/notification-preferences/mine` | 🔑 |
| PUT | `/notification-preferences/mine` | 🔑 |

## Support
| Method | Path | Auth |
|---|---|---|
| POST | `/support/tickets` | 🔑 |
| GET | `/support/tickets/mine` | 🔑 |
| POST | `/support/tickets/:id/messages` | 🔑 |
| GET | `/support/tickets/all` | 🛡️ Admin/Receptionist |
| PATCH | `/support/tickets/:id/status` | 🛡️ Admin/Receptionist |

## Dashboards
| Method | Path | Auth |
|---|---|---|
| GET | `/dashboard/tenant` | 🔑 |
| GET | `/dashboard/manager/:organisationId` | 🛡️ Owner/Manager/Accountant/Admin |
| GET | `/dashboard/admin` | 🛡️ Admin |

## Health
| Method | Path | Auth |
|---|---|---|
| GET | `/health` | 🔓 — liveness probe for orchestration |
