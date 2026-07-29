import * as Sentry from "@sentry/node";

/**
 * Part D/M: error tracking. `SENTRY_DSN` is `Information Required` until a
 * real Sentry project exists — when it's unset, this is a no-op rather than
 * silently pretending errors are being tracked somewhere they aren't.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || dsn === "Information Required") {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  });
}
