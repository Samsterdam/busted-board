/** Rating-scale and taste-profile gating constants. Dependency-free. */

/** Star-rating scale is 1–5. */
export const RATING_MIN = 1;
export const RATING_MAX = 5;

/** Source of a rating — distinguishes deliberate user ratings from quiz verdicts and quick card reactions. */
export const RATING_SOURCE_USER = "user";
export const RATING_SOURCE_QUIZ = "quiz";
export const RATING_SOURCE_QUICK = "quick";
export const RATING_SOURCE_TRAKT = "trakt";

/** Minimum number of ratings before a taste profile can be generated. */
export const MIN_RATINGS_FOR_PROFILE = 3;

/** Max character lengths for user-supplied string fields that feed Gemini prompts. */
export const NOTES_MAX_LENGTH = 500;
export const TITLE_MAX_LENGTH = 200;

/** Maximum rows accepted by the bulk import endpoint in a single request. */
export const IMPORT_BATCH_LIMIT = 2000;

/** Allowed values for the watch_status column. */
export const VALID_WATCH_STATUSES = ["watched", "watching", "completed", "dropped"] as const;
export type WatchStatus = typeof VALID_WATCH_STATUSES[number];
