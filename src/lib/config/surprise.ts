export const SURPRISE_POOL_SIZE = 9;
export const SURPRISE_ENRICH_FACTOR = 3; // fetch this many times the pool size before enrichment
export const SURPRISE_RESHUFFLE_PROMPT_AT = 2;

// Only genres present in BOTH MOVIE_GENRE_IDS and TV_GENRE_IDS (collections.ts).
// Horror, Western, Romance, Thriller are absent from TV_GENRE_IDS — including
// them would silently produce unfiltered TV results from the discover endpoint.
export const MOOD_OPTIONS = [
  "Action",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Mystery",
  "Science Fiction",
] as const;

export type Mood = (typeof MOOD_OPTIONS)[number];
