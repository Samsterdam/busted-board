/** Per-IP rate limit caps. Enforced in middleware via Upstash Redis. */

/** POST /api/taste-profile/analyze — calls Gemini; 10/hr is generous for a human. */
export const RATE_LIMIT_TASTE_PROFILE_RPH = 10;

/** GET /api/recommendations/feed — calls Gemini when cache is stale. */
export const RATE_LIMIT_FEED_RPH = 30;

/** All other /api/* routes — general abuse floor. */
export const RATE_LIMIT_GENERAL_RPH = 300;
