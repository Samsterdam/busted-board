// Curated "browse" collections and TMDB genre maps. (cache-bust: 804ce56)
//
// Each collection maps a human-facing category to a set of TMDB `discover`
// query params. Keeping these here (rather than inline in routes) is the single
// source of truth for browse categories and satisfies the no-magic-values rule.
//
// All keyword IDs below were resolved against the live TMDB keyword endpoint
// (GET /search/keyword) — they are not guesses. Nationality-based collections
// use `with_origin_country` rather than place-name keywords, which is the
// robust way to scope a national cinema.

export type CollectionMediaType = "movie" | "tv" | "both";

export interface Collection {
  id: string;
  label: string;
  mediaType: CollectionMediaType;
  // Discover params per endpoint. Movie discover uses `primary_release_date.*`;
  // TV discover uses `first_air_date.*` — so the two are kept separate even when
  // they happen to share values today.
  movieParams?: Record<string, string>;
  tvParams?: Record<string, string>;
}

// --- Verified TMDB keyword IDs (via GET /search/keyword) --------------------
const KW_LGBT = 158718; // TMDB keyword "lgbt"
const KW_LGBTQ = 375924; // TMDB keyword "lgbtq"
const KW_AFRICAN_AMERICAN = 256015; // TMDB keyword "african american"

// `with_keywords` joins IDs with "|" for OR, "," for AND. We want OR here.
const LGBTQ_KEYWORDS = `${KW_LGBT}|${KW_LGBTQ}`;

// Origin-country ISO 3166-1 codes for national-cinema collections.
const COUNTRY_CUBA = "CU";
const COUNTRY_INDIA = "IN";

// Shared sort: popularity keeps each category lively and is valid on both
// movie and TV discover endpoints.
const SORT_POPULAR = "popularity.desc";

// Light quality floors. `number_of_seasons.gte` is NOT a supported discover/tv
// filter (TMDB silently ignores it), so "bingeable" is approximated by
// long-tail popularity: a high vote_count means a widely-watched, established
// show — the kind worth committing to.
export const BINGEABLE_MIN_VOTES = "500";
export const BINGEABLE_MIN_RATING = "7";
// Keeps tiny national catalogs from surfacing un-rated noise.
const NATIONAL_MIN_VOTES = "20";

export const COLLECTIONS: Collection[] = [
  {
    id: "bingeable",
    label: "Bingeable",
    mediaType: "tv",
    tvParams: {
      sort_by: SORT_POPULAR,
      "vote_average.gte": BINGEABLE_MIN_RATING,
      "vote_count.gte": BINGEABLE_MIN_VOTES,
    },
  },
  {
    id: "lgbtq",
    label: "LGBTQ+",
    mediaType: "both",
    movieParams: { with_keywords: LGBTQ_KEYWORDS, sort_by: SORT_POPULAR },
    tvParams: { with_keywords: LGBTQ_KEYWORDS, sort_by: SORT_POPULAR },
  },
  {
    id: "black-cinema",
    label: "Black Cinema",
    mediaType: "both",
    movieParams: { with_keywords: String(KW_AFRICAN_AMERICAN), sort_by: SORT_POPULAR },
    tvParams: { with_keywords: String(KW_AFRICAN_AMERICAN), sort_by: SORT_POPULAR },
  },
  {
    id: "cuban-cinema",
    label: "Cuban Cinema",
    mediaType: "both",
    movieParams: { with_origin_country: COUNTRY_CUBA, sort_by: SORT_POPULAR },
    tvParams: { with_origin_country: COUNTRY_CUBA, sort_by: SORT_POPULAR },
  },
  {
    id: "indian-cinema",
    label: "Indian Cinema",
    mediaType: "both",
    movieParams: {
      with_origin_country: COUNTRY_INDIA,
      sort_by: SORT_POPULAR,
      "vote_count.gte": NATIONAL_MIN_VOTES,
    },
    tvParams: {
      with_origin_country: COUNTRY_INDIA,
      sort_by: SORT_POPULAR,
      "vote_count.gte": NATIONAL_MIN_VOTES,
    },
  },
];

export function getCollection(id: string): Collection | undefined {
  return COLLECTIONS.find((c) => c.id === id);
}

// Params for a bare media-type browse (no collection selected): popular,
// reasonably-rated titles. Valid on both the movie and TV discover endpoints.
export const DEFAULT_BROWSE_PARAMS: Record<string, string> = {
  sort_by: SORT_POPULAR,
  "vote_count.gte": "200",
  "vote_average.gte": "6",
};

// --- TMDB genre name -> id maps --------------------------------------------
// Movie and TV genres are different TMDB namespaces with different ids and
// (in a few cases) different names. Search interpretation emits movie-style
// genre names; TV_GENRE_IDS maps the ones that have a clean TV equivalent.

export const MOVIE_GENRE_IDS: Record<string, number> = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 14,
  Horror: 27,
  Mystery: 9648,
  Romance: 10749,
  "Science Fiction": 878,
  Thriller: 53,
};

export const TV_GENRE_IDS: Record<string, number> = {
  Action: 10759, // TMDB: "Action & Adventure"
  Adventure: 10759,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Fantasy: 10765, // TMDB: "Sci-Fi & Fantasy"
  Mystery: 9648,
  "Science Fiction": 10765, // TMDB: "Sci-Fi & Fantasy"
};

export function genreNamesToIds(names: string[], mediaType: "movie" | "tv"): string {
  const map = mediaType === "tv" ? TV_GENRE_IDS : MOVIE_GENRE_IDS;
  return [...new Set(names.map((g) => map[g]).filter(Boolean))].join(",");
}
