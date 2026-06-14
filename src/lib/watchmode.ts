import { env } from "./env";
import {
  CATALOG_WATCHMODE_LIMIT,
  CATALOG_WATCHMODE_SHOWS_LIMIT,
  WATCHMODE_MAX_LIMIT,
} from "./config/catalog";

const WATCHMODE_BASE = "https://api.watchmode.com/v1";

export interface WatchmodeTitle {
  tmdbId: number;
  tmdbType: "movie" | "tv";
  title: string;
  year: number | null;
}

/**
 * Fetch titles from Watchmode for one or more source IDs.
 *
 * @param mediaType "movie" for films, "tv" for series
 * Returns [] if the API key is absent or the request fails.
 */
export async function fetchWatchmodeTitles(
  sourceIds: number[],
  mediaType: "movie" | "tv",
  limit: number = mediaType === "movie" ? CATALOG_WATCHMODE_LIMIT : CATALOG_WATCHMODE_SHOWS_LIMIT
): Promise<WatchmodeTitle[]> {
  const key = env.WATCHMODE_API_KEY;
  if (!key || sourceIds.length === 0) return [];

  // Watchmode uses "movie" for films and "show" for TV
  const wmType = mediaType === "movie" ? "movie" : "show";

  const params = new URLSearchParams({
    apiKey: key,
    source_ids: sourceIds.join(","),
    types: wmType,
    sort_by: "popularity_desc",
    limit: String(Math.min(limit, WATCHMODE_MAX_LIMIT)),
    regions: "US",
  });

  try {
    const res = await fetch(`${WATCHMODE_BASE}/list-titles/?${params}`);
    if (!res.ok) return [];

    const data = await res.json() as {
      titles?: Array<{ tmdb_id?: number; title?: string; year?: number; type?: string }>;
    };

    return (data.titles ?? [])
      .filter((t) => t.tmdb_id != null)
      .map((t) => ({
        tmdbId: t.tmdb_id!,
        tmdbType: mediaType,
        title: t.title ?? "",
        year: t.year ?? null,
      }));
  } catch {
    return [];
  }
}

/** Backward-compat alias — fetches movies only. */
export function fetchWatchmodeMovies(
  sourceIds: number[],
  limit: number = CATALOG_WATCHMODE_LIMIT
): Promise<WatchmodeTitle[]> {
  return fetchWatchmodeTitles(sourceIds, "movie", limit);
}
