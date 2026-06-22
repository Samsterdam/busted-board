/**
 * Single typed accessor for server-side secrets.
 *
 * App code reads secrets here instead of scattering `process.env.X` across
 * modules (AGENTS.md: "secrets … Access through a single typed config module").
 *
 * SERVER-ONLY — never import this from a client component; it would leak secrets
 * into the browser bundle. (Public `NEXT_PUBLIC_*` ad vars live in
 * `lib/ads/env.ts`, which must read them as literal member expressions so Next
 * can inline them client-side.)
 *
 * Required vars use `!` (asserted present at deploy time, as the call sites did
 * before); optional ones are typed `string | undefined` and consumers handle
 * absence.
 */
export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  TMDB_API_KEY: process.env.TMDB_API_KEY!,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
  /** Optional — score enrichment degrades gracefully when unset. */
  OMDB_API_KEY: process.env.OMDB_API_KEY,
  /** Optional — rate limiting via Upstash Redis. Skipped when unset (local dev). */
  UPSTASH_REDIS_REST_URL:   process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  /** Optional — Movie of the Night streaming availability API. */
  STREAMING_AVAILABILITY_API_KEY: process.env.STREAMING_AVAILABILITY_API_KEY,
  /** Optional — Watchmode streaming availability API. */
  WATCHMODE_API_KEY: process.env.WATCHMODE_API_KEY,
  /** Optional — secret header required to trigger catalog sync. */
  CATALOG_SYNC_SECRET: process.env.CATALOG_SYNC_SECRET,
  /** Optional — email address that sees the admin sync UI. */
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  /** Optional — ScrapeCreators API key for Reddit data (replaces deprecated Reddit OAuth). */
  SCRAPECREATORS_API_KEY: process.env.SCRAPECREATORS_API_KEY,
  /** Optional — Bearer token for the /api/admin/growth/scan cron endpoint. */
  GROWTH_ADMIN_SECRET: process.env.GROWTH_ADMIN_SECRET,
} as const;
