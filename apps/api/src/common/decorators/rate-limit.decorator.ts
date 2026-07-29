import { SetMetadata } from "@nestjs/common";

export const RATE_LIMIT_KEY = "rate_limit";

export interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
}

/**
 * Applies a fixed-window rate limit keyed by client IP + route, backed by
 * Redis. Used on auth endpoints (Part M: brute-force protection) — login,
 * registration, and OTP request/verify are the highest-value targets for a
 * credential-stuffing or OTP-guessing attacker.
 */
export const RateLimit = (limit: number, windowSeconds: number) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, windowSeconds } satisfies RateLimitOptions);
