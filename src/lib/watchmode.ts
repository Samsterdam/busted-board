import { env } from "./env";
import { CATALOG_WATCHMODE_LIMIT, WATCHMODE_MAX_LIMIT } from "./config/catalog";

const WATCHMODE_BASE = "https://api.watchmode.com/v1";

export interface WatchmodeMovie {
  tmdbId: number;
  title: string;
  year: number | null;
}

/**
 * Fetch movies from Watchmode for one or more source IDs.
 * Returns [] if the API key is absent or the request fails.
 */
export async function fetchWatchmodeMovies(
  sourceIds: number[],
  limit: number = CATALOG_WATCHMODE_LIMIT
): Promise<WatchmodeMovie[]> {
  const key = env.WATCHMODE_API_KEY;
  if (!key || sourceIds.length === 0) return [];

  const params = new URLSearchParams({
    apiKey: key,
    source_ids: sourceIds.join(","),
    types: "movie",
    sort_by: "popularity_desc",
    limit: String(Math.min(limit, WATCHMODE_MAX_LIMIT)),
    regions: "US",
  });

  try {
    const res = await fetch(`${WATCHMODE_BASE}/list-titles/?${params}`);
    if (!res.ok) return [];

    const data = await res.json() as {
      titles?: Array<{ tmdb_id?: number; title?: string; year?: number }>;
    };

    return (data.titles ?? [])
      .filter((t) => t.tmdb_id != null)
      .map((t) => ({
        tmdbId: t.tmdb_id!,
        title: t.title ?? "",
        year: t.year ?? null,
      }));
  } catch {
    return [];
  }
}
