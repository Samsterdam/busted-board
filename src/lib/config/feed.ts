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
