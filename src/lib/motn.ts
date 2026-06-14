import { env } from "./env";
import {
  CATALOG_MIN_MOTN_RATING,
  CATALOG_MOVIES_PER_PLATFORM,
  CATALOG_SHOWS_PER_PLATFORM,
  MOTN_PAGE_SIZE,
} from "./config/catalog";

const MOTN_BASE = "https://api.movieofthenight.com/v4";

export interface MoTNTitle {
  tmdbId: number;
  tmdbType: "movie" | "tv";
  title: string;
  releaseYear: number | null;
  overview: string;
  motnRating: number;
  posterPath: string | null;
  seasonCount: number | null;
  episodeCount: number | null;
}

// MOTN returns tmdbId as "movie/603" or "tv/1396".
// Returns null for malformed or missing values.
function parseTmdbId(raw: string | null | undefined): { id: number; type: "movie" | "tv" } | null {
  if (!raw) return null;
  const parts = raw.split("/");
  if (parts.length !== 2) return null;
  if (parts[0] !== "movie" && parts[0] !== "tv") return null;
  const n = parseInt(parts[1], 10);
  if (isNaN(n)) return null;
  return { id: n, type: parts[0] as "movie" | "tv" };
}

function extractPosterPath(imageSet: Record<string, string> | null | undefined): string | null {
  if (!imageSet) return null;
  return imageSet["verticalPoster.w480"] ?? imageSet["verticalPoster.w360"] ?? null;
}

/**
 * Fetch titles from Movie of the Night for a specific service and show type.
 * Paginates until `limit` reached or no more results.
 * Returns [] if the API key is absent or the request fails.
 *
 * @param showType "movie" for films, "series" for TV shows
 */
export async function fetchMoTNTitles(
  serviceId: string,
  country: string,
  showType: "movie" | "series",
  limit: number = showType === "movie" ? CATALOG_MOVIES_PER_PLATFORM : CATALOG_SHOWS_PER_PLATFORM
): Promise<MoTNTitle[]> {
  const key = env.STREAMING_AVAILABILITY_API_KEY;
  if (!key) return [];

  const results: MoTNTitle[] = [];
  let cursor: string | undefined;
  const maxPages = Math.ceil(limit / MOTN_PAGE_SIZE);
  const expectedType: "movie" | "tv" = showType === "movie" ? "movie" : "tv";

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      country,
      catalogs: serviceId,
      show_type: showType,
      order_by: "rating",
      rating_min: String(CATALOG_MIN_MOTN_RATING),
      series_granularity: "show",
      ...(cursor ? { cursor } : {}),
    });

    try {
      const res = await fetch(`${MOTN_BASE}/shows/search/filters?${params}`, {
        headers: { "X-API-Key": key },
      });
      if (!res.ok) break;

      const data = await res.json() as {
        shows: Array<{
          tmdbId?: string;
          title: string;
          releaseYear?: number;
          firstAirYear?: number;
          overview?: string;
          rating?: number;
          imageSet?: Record<string, string>;
          seasonCount?: number;
          episodeCount?: number;
        }>;
        hasMore: boolean;
        nextCursor?: string;
      };

      for (const show of data.shows ?? []) {
        const parsed = parseTmdbId(show.tmdbId ?? null);
        if (!parsed || parsed.type !== expectedType) continue;
        results.push({
          tmdbId: parsed.id,
          tmdbType: parsed.type,
          title: show.title,
          releaseYear: show.releaseYear ?? show.firstAirYear ?? null,
          overview: show.overview ?? "",
          motnRating: show.rating ?? 0,
          posterPath: extractPosterPath(show.imageSet ?? null),
          seasonCount: show.seasonCount ?? null,
          episodeCount: show.episodeCount ?? null,
        });
        if (results.length >= limit) break;
      }

      if (!data.hasMore || !data.nextCursor || results.length >= limit) break;
      cursor = data.nextCursor;
    } catch {
      break;
    }
  }

  return results;
}

/** Backward-compat alias — fetches movies only. */
export function fetchMoTNMovies(
  serviceId: string,
  country: string,
  limit: number = CATALOG_MOVIES_PER_PLATFORM
): Promise<MoTNTitle[]> {
  return fetchMoTNTitles(serviceId, country, "movie", limit);
}
