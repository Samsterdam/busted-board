// Growth / marketing automation config.
// All subreddit names, search keywords, and operational limits live here.

export const GROWTH_SUBREDDITS = [
  "trakt",
  "cordcutters",
  "streaming",
  "television",
  "netflix",
  "Piracy",
  "movies",
  "tvshows",
  "Letterboxd",
  "MovieSuggestions",
  "NetflixBestOf",
  "mubi",
] as const;

export const GROWTH_KEYWORDS = [
  // Competitor mentions (any mention is relevant)
  "trakt",
  "justwatch",
  "letterboxd",
  // Discovery / recommendation requests
  "what to watch",
  "what should i watch",
  "something to watch",
  "any recommendations",
  "any suggestions",
  "recommend me",
  "looking for a show",
  "looking for something to watch",
  "need something to watch",
  "suggest something",
  "movie recommendation",
  "tv recommendation",
  "show recommendation",
  // Tracker / watchlist app interest
  "watchlist app",
  "watch tracker",
  "show tracker",
  "movie tracker",
  "track my shows",
  "track what i watch",
  "letterboxd alternative",
  // Streaming frustration / switching
  "streaming alternative",
  "cancel trakt",
  "trakt price",
] as const;

/** Minimum Reddit post score (upvotes) to store as an opportunity. */
export const GROWTH_MIN_SCORE = 1;

/** Max opportunities to upsert per scanner run (prevents runaway DB writes). */
export const GROWTH_MAX_OPPORTUNITIES_PER_RUN = 50;

/** Only surface threads posted within this many hours. */
export const GROWTH_MAX_THREAD_AGE_HOURS = 48;

/** Max new posts to fetch per subreddit per scan run. */
export const GROWTH_POSTS_PER_SUBREDDIT = 50;

/** Max characters of a Reddit post body to persist (keeps rows lean). */
export const GROWTH_MAX_BODY_LENGTH = 2000;

/** Pause between consecutive Reddit search API calls to stay under rate limits. */
export const GROWTH_SEARCH_DELAY_MS = 1000;

/** Max opportunities returned per list query. */
export const GROWTH_OPPORTUNITIES_QUERY_LIMIT = 50;

/** Gemini model to use for reply drafting. */
export const GROWTH_GEMINI_MODEL = "gemini-2.5-flash-lite";

export type OpportunityStatus = "pending" | "drafted" | "posted" | "dismissed";
export type SocialPostStatus = "draft" | "queued" | "posted";
export type GrowthPlatform = "reddit" | "twitter";
