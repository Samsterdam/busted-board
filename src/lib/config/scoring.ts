/**
 * Cinema-score, ribbon, and recommendation thresholds. Dependency-free so it is
 * safe to import from client components (e.g. ScoreDisplay) and server code.
 *
 * Numeric thresholds only. String-valued TMDB discover params (e.g.
 * `"vote_average.gte": "7.5"`) stay inline at their call sites — they are
 * config-shaped request payloads, not magic numbers.
 */

/** Cinema score blends audience + critics, each weighted 50%. */
export const CINEMA_SCORE_WEIGHT = 0.5;
/** Audience `vote_average` is 0–10; ×10 lifts it onto the 0–100 critics scale. */
export const AUDIENCE_SCORE_SCALE = 10;

/** Cinema-score color cutoffs (shared by scores.ts and ScoreDisplay). */
export const CINEMA_SCORE_GREEN_MIN = 80;
export const CINEMA_SCORE_AMBER_MIN = 60;

/** Ribbon thresholds. */
export const RIBBON_TRENDING_MIN_POPULARITY = 100;
export const RIBBON_GEM_MIN_VOTE_AVG = 7.5;
export const RIBBON_GEM_MAX_POPULARITY = 20;
export const RIBBON_FAVORITE_MIN_VOTE_COUNT = 10_000;
export const RIBBON_NEW_WITHIN_MONTHS = 6;

/** Recommendation candidate-bucket ages/windows (numeric). */
export const CLASSICS_MIN_AGE_YEARS = 20;
export const RECENT_WITHIN_MONTHS = 18;
export const MORE_FEED_OLD_MIN_AGE_YEARS = 5;

/** Default min `vote_average` when a search query doesn't specify one. */
export const SEARCH_MIN_VOTE_AVG_DEFAULT = 6.0;
