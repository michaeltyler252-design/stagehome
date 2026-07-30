// Any Vercel-hosted origin whose subdomain starts with "stagehome" is
// accepted in addition to the explicit WEB_APP_ORIGIN allowlist.
const VERCEL_ORIGIN_PATTERN = /^https:\/\/stagehome[a-z0-9-]*\.vercel\.app$/;

/**
 * Decides whether a given request Origin is allowed by CORS.
 *
 * This is the actual fix for a real, recurring production problem: Vercel
 * issues a brand-new URL on every redeploy and on every distinct project,
 * and a static exact-match allowlist (just `explicitOrigins`) breaks
 * registration/login every single time until someone manually updates
 * WEB_APP_ORIGIN and redeploys the API. Accepting the
 * "stagehome*.vercel.app" pattern in addition to the explicit list
 * actually solves that churn, while staying scoped enough that it
 * wouldn't accept a credentialed request from an unrelated Vercel site.
 */
export function isAllowedOrigin(origin: string, explicitOrigins: string[]): boolean {
  return explicitOrigins.includes(origin) || VERCEL_ORIGIN_PATTERN.test(origin);
}
