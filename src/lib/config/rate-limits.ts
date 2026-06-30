/** Per-IP rate limit caps. Enforced in middleware via Upstash Redis. */

/** POST /api/taste-profile/analyze — calls Gemini; 10/hr is generous for a human. */
export const RATE_LIMIT_TASTE_PROFILE_RPH = 10;

/** GET /api/recommendations/feed — calls Gemini when cache is stale. */
export const RATE_LIMIT_FEED_RPH = 30;

/** All other /api/* routes — general abuse floor. */
export const RATE_LIMIT_GENERAL_RPH = 300;

/**
 * Anonymous (unauthenticated) /api/* routes — e.g. the public DB-backed browse
 * route. No login required, so this is the first surface a bot or a cold link
 * crowd hits; capped tighter than the authed general floor.
 */
export const RATE_LIMIT_PUBLIC_RPH = 60;

/**
 * Pathnames of the Gemini-backed routes. Named here so the limiter selection
 * (pickLimiter) and the production fail-closed check share one source of truth.
 */
export const ROUTE_TASTE_PROFILE_ANALYZE = "/api/taste-profile/analyze";
export const ROUTE_RECOMMENDATIONS_FEED = "/api/recommendations/feed";
