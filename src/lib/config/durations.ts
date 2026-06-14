/**
 * Time constants — cache TTLs, request timeouts, retry/cooldown windows.
 *
 * One home for every duration so the magic time-math (`7 * 24 * 60 * 60 * 1000`)
 * lives in exactly one place. Dependency-free and safe to import from both
 * server and client code.
 */

const MS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_YEAR = 365;

export const MS_PER_MINUTE = SECONDS_PER_MINUTE * MS_PER_SECOND;
export const MS_PER_HOUR = MINUTES_PER_HOUR * MS_PER_MINUTE;
export const MS_PER_DAY = HOURS_PER_DAY * MS_PER_HOUR;

/** Scores cache: critic/audience scores change slowly → 7 days. */
export const SCORE_CACHE_TTL_MS = 7 * MS_PER_DAY;
/** Streaming availability shifts faster than scores → 1 day. */
export const AVAILABILITY_CACHE_TTL_MS = 1 * MS_PER_DAY;
/** Recommendation-feed cache freshness → 12 hours. */
export const FEED_CACHE_MAX_AGE_MS = 12 * MS_PER_HOUR;
/** OMDB fetch timeout. */
export const OMDB_TIMEOUT_MS = 8 * MS_PER_SECOND;
/** TMDB fetch timeout. */
export const TMDB_TIMEOUT_MS = 10 * MS_PER_SECOND;
/** Gemini retry backoff base (multiplied by the attempt number). */
export const GEMINI_RETRY_BACKOFF_MS = 1 * MS_PER_SECOND;
/** Taste-profile regeneration cooldown → 5 minutes. */
export const TASTE_PROFILE_COOLDOWN_MS = 5 * MS_PER_MINUTE;
/** Ad-consent cookie lifetime, in seconds (cookie `max-age`) → 1 year. */
export const CONSENT_MAX_AGE_S =
  DAYS_PER_YEAR * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;
