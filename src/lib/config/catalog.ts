/**
 * Platform catalog sync configuration.
 *
 * Maps our internal platform slugs to external API identifiers for
 * Movie of the Night (MOTN) and Watchmode. Platforms absent from a map
 * are not synced from that source.
 *
 * MOTN covers mainstream paid + AVOD services.
 * Watchmode covers library/niche free services not in MOTN.
 */

// Movie of the Night service IDs → https://api.movieofthenight.com/v4/countries/us
export const MOTN_SERVICE_IDS: Partial<Record<string, string>> = {
  netflix: "netflix",
  prime: "prime",
  disney: "disney",
  max: "hbo",
  hulu: "hulu",
  appletv: "apple",
  roku: "roku",
  peacock: "peacock",
  paramount: "paramount",
  tubi: "tubi",
  pluto: "plutotv",
};

// Watchmode source IDs → https://api.watchmode.com/v1/sources/?regions=US
export const WATCHMODE_SOURCE_IDS: Partial<Record<string, number>> = {
  youtube: 345,  // YouTube Free
  hoopla: 390,
  plex: 439,
  pbs: 215,
  vix: 474,
  xumo: 472,
};

// MOTN's API returns this many results per page
export const MOTN_PAGE_SIZE = 20;

// Scale factor: MOTN rates 0–100, TMDB uses 0–10
export const MOTN_RATING_DIVISOR = 10;

// Default rating used when motnRating is null (neutral mid-quality)
export const CATALOG_DEFAULT_RATING = 60;

// Watchmode hard cap on results per call
export const WATCHMODE_MAX_LIMIT = 250;

// Max movies to fetch per platform from MOTN (5 pages × 20 per page)
export const CATALOG_MOVIES_PER_PLATFORM = 100;

// Max TV shows to fetch per platform from MOTN (5 pages × 20 per page)
export const CATALOG_SHOWS_PER_PLATFORM = 100;

// Max movies to fetch per Watchmode source ID per sync
export const CATALOG_WATCHMODE_LIMIT = 50;

// Max TV shows to fetch per Watchmode source ID per sync
export const CATALOG_WATCHMODE_SHOWS_LIMIT = 50;

// Minimum MOTN rating (0–100) to include in catalog — filters low-quality filler
export const CATALOG_MIN_MOTN_RATING = 55;

// All catalog data is synced for US region only (known limitation)
export const CATALOG_SYNC_REGION = "US";

// --- Sync hardening ---

import { MS_PER_DAY } from "./durations";

// Minimum time between syncs for a given platform+type — prevents double-syncs
export const CATALOG_SYNC_COOLDOWN_MS = MS_PER_DAY;

// Monthly MOTN API request budget (free tier)
export const CATALOG_MOTN_MONTHLY_BUDGET = 500;

// Reserve this many calls as a safety margin — never sync past this point
export const CATALOG_MOTN_BUDGET_RESERVE = 50;

// Safe budget: stop syncing if accumulated calls would exceed this
export const CATALOG_MOTN_SAFE_BUDGET = CATALOG_MOTN_MONTHLY_BUDGET - CATALOG_MOTN_BUDGET_RESERVE;

// --- Feed mixing ---

// Maximum fraction of the final feed that can be TV shows (prevents flooding)
export const CATALOG_TV_FEED_MAX_RATIO = 0.4;
