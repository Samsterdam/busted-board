/**
 * Kids Mode content filtering. Dependency-free so it is safe to import from both
 * server routes and the recommendation engine.
 *
 * Filtering happens at TMDB query time via `discover` params — we never fetch or
 * store per-title certifications.
 *
 * Movie vs. TV asymmetry (verified against TMDB, not assumed):
 *  - `/discover/movie` supports `certification_country` + `certification.lte`.
 *    `certification.lte=PG` with `certification_country=US` works as an ordered
 *    range (returns G + PG). Both params are interdependent and must be sent
 *    together; country code must be uppercase.
 *  - `/discover/tv` has NO certification param at all → TV is genre-filtered only.
 *
 * Genre sets are defined independently per media type: TMDB TV has no "Family"
 * genre (the kid-ish TV genre is "Kids" = 10762), so reusing the movie name list
 * would silently produce the wrong TV filter.
 */

/** MPAA certification ceiling for movies (TMDB ordered range: G < PG < PG-13 < R < NC-17). */
export const KIDS_CERTIFICATION_COUNTRY = "US";
export const KIDS_MOVIE_CERT_MAX = "PG";

/** Defense-in-depth: TMDB defaults this to false, but we pin it in kids mode. */
export const KIDS_INCLUDE_ADULT = "false";

/** Family-leaning TMDB movie genre ids (Animation, Family, Adventure, Comedy, Fantasy). */
const KIDS_MOVIE_GENRES = [16, 10751, 12, 35, 14] as const;
/** Family-leaning TMDB TV genre ids (Animation, Kids, Comedy, Sci-Fi & Fantasy). */
const KIDS_TV_GENRES = [16, 10762, 35, 10765] as const;

/** Pipe-joined → TMDB `with_genres` OR-match (any one genre qualifies). */
export const KIDS_MOVIE_GENRE_IDS = KIDS_MOVIE_GENRES.join("|");
export const KIDS_TV_GENRE_IDS = KIDS_TV_GENRES.join("|");

/**
 * Union of kid-safe movie + TV genre ids, for post-fetch filtering of results
 * from endpoints that don't support `with_genres` (e.g. `/search/multi`). A
 * title qualifies if any of its `genre_ids` is in this set.
 */
const KIDS_ALL_GENRE_IDS: ReadonlySet<number> = new Set<number>([...KIDS_MOVIE_GENRES, ...KIDS_TV_GENRES]);

/** True if a title's TMDB genre_ids overlap the kid-safe genre set. */
export function isKidSafeByGenre(genreIds: number[] | undefined): boolean {
  return (genreIds ?? []).some((id) => KIDS_ALL_GENRE_IDS.has(id));
}

/**
 * Kids mode narrows hard (cert + genres) and drops the catalog + trending
 * buckets, so we widen the candidate fetch budget to keep the on-platform feed
 * from starving for users with a single streaming service.
 */
export const KIDS_FETCH_BUDGET_MULTIPLIER = 2;

/**
 * Each discover bucket normally fetches only TMDB page 1 (~20 titles). In kids
 * mode the genre+cert pool is small, so a user with a large watch history can
 * exhaust page 1 entirely (every kid-safe hit is already seen → empty feed). We
 * fetch this many pages per bucket and concatenate, deepening the fresh-title
 * pool enough to survive the seen-list filter.
 */
export const KIDS_BUCKET_PAGES = 5;

/**
 * TMDB `discover` params that restrict results to kid-safe content for the given
 * media type. Returns `{}` when not in kids mode so callers can spread
 * unconditionally: `{ ...base, ...kidsDiscoverParams("movie", kidsMode) }`.
 */
export function kidsDiscoverParams(
  mediaType: "movie" | "tv",
  kidsMode: boolean
): Record<string, string> {
  if (!kidsMode) return {};
  if (mediaType === "movie") {
    return {
      certification_country: KIDS_CERTIFICATION_COUNTRY,
      "certification.lte": KIDS_MOVIE_CERT_MAX,
      with_genres: KIDS_MOVIE_GENRE_IDS,
      include_adult: KIDS_INCLUDE_ADULT,
    };
  }
  return {
    with_genres: KIDS_TV_GENRE_IDS,
    include_adult: KIDS_INCLUDE_ADULT,
  };
}
