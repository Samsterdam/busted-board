/**
 * Feed/search candidate fetch & slice limits. Dependency-free.
 *
 * Each provider/scores lookup costs network calls, so these caps bound how much
 * raw TMDB output gets enriched before the user ever sees a screenful.
 */

// Main feed (recommendation-engine.buildFeed)
export const FEED_PROVIDER_LOOKUP_LIMIT = 60; // raw candidates to check providers for
export const FEED_RANK_LIMIT = 30; // on-platform candidates passed to ranking

// Pagination (recommendation-engine.buildMoreFeed)
export const MORE_FEED_PROVIDER_LOOKUP_LIMIT = 40;
export const MORE_FEED_RESULT_LIMIT = 12;

// Search route enrichment
export const SEARCH_PROVIDER_LOOKUP_LIMIT = 20;
export const SEARCH_RESULT_LIMIT = 8;

// Gemini fallback ranking when the model returns nothing usable
export const FALLBACK_RANK_LIMIT = 10;

// Trending titles the seed-movies admin route enriches
export const SEED_MOVIES_LIMIT = 8;

/** Characters of an ISO date that form the year: `"2024-05-01".slice(0, 4)`. */
export const YEAR_PREFIX_LENGTH = 4;

// Infinite scroll — how far before the sentinel (px) to fire the next-page fetch
export const FEED_SCROLL_PRELOAD_PX = 600;

// Franchise "where to start" section (FranchiseSection)
export const FRANCHISE_COLLAPSED_PREVIEW_COUNT = 4; // parts shown before "Show all"
export const FRANCHISE_MIN_PARTS_TO_SHOW = 2;       // below this it isn't a series

// Discovery section (discovery-engine.buildDiscoveryItems)
export const DISCOVERY_CANDIDATE_LIMIT = 40; // provider lookups per request
export const DISCOVERY_RESULT_LIMIT = 8;     // max items returned
export const DISCOVERY_MIN_VOTE_AVERAGE = "7.0";
export const DISCOVERY_MIN_VOTE_COUNT = "100";
