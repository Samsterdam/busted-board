import { discoverMovies, discoverShows, type TmdbMovie, type TmdbShow } from "./tmdb";

/**
 * TMDB `discover` bucket fetchers for the recommendation engine.
 *
 * `pages` > 1 fetches that many TMDB pages in parallel and concatenates them.
 * Used by kids mode to deepen a narrow candidate pool; defaults to 1 page so
 * normal-mode call sites are unchanged. A `page` already in `params` is the
 * starting offset.
 */

export async function fetchMovieBucket(
  params: Record<string, string>,
  pages = 1
): Promise<(TmdbMovie & { media_type: "movie" })[]> {
  const startPage = Number(params.page ?? "1") || 1;
  try {
    const results = await Promise.all(
      Array.from({ length: pages }, (_, i) =>
        discoverMovies({ ...params, page: String(startPage + i) })
          .then((r) => r.results ?? [])
          .catch(() => [])
      )
    );
    return results.flat().map((r) => ({ ...r, media_type: "movie" as const }));
  } catch {
    return [];
  }
}

export async function fetchShowBucket(
  params: Record<string, string>,
  pages = 1
): Promise<(TmdbShow & { media_type: "tv" })[]> {
  const startPage = Number(params.page ?? "1") || 1;
  try {
    const results = await Promise.all(
      Array.from({ length: pages }, (_, i) =>
        discoverShows({ ...params, page: String(startPage + i) })
          .then((r) => r.results ?? [])
          .catch(() => [])
      )
    );
    return results.flat().map((r) => ({ ...r, media_type: "tv" as const }));
  } catch {
    return [];
  }
}
