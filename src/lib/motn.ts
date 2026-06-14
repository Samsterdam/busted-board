import { env } from "./env";
import { CATALOG_MIN_MOTN_RATING, CATALOG_MOVIES_PER_PLATFORM, MOTN_PAGE_SIZE } from "./config/catalog";

const MOTN_BASE = "https://api.movieofthenight.com/v4";
const MAX_PAGES = Math.ceil(CATALOG_MOVIES_PER_PLATFORM / MOTN_PAGE_SIZE);

export interface MoTNMovie {
  tmdbId: number;
  title: string;
  releaseYear: number | null;
  overview: string;
  motnRating: number;
  posterPath: string | null;
}

// MOTN returns tmdbId as "movie/603" — extract the numeric part.
// Returns null for TV shows ("tv/1396") or malformed values.
function parseTmdbId(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const parts = raw.split("/");
  if (parts.length !== 2 || parts[0] !== "movie") return null;
  const n = parseInt(parts[1], 10);
  return isNaN(n) ? null : n;
}

function extractPosterPath(imageSet: Record<string, string> | null | undefined): string | null {
  if (!imageSet) return null;
  // Use verticalPoster.w480 if available, fall back to any vertical poster
  return imageSet["verticalPoster.w480"] ?? imageSet["verticalPoster.w360"] ?? null;
}

/**
 * Fetch movies from Movie of the Night for a specific service.
 * Paginates until `limit` reached or no more results.
 * Returns [] if the API key is absent or the request fails.
 */
export async function fetchMoTNMovies(
  serviceId: string,
  country: string,
  limit: number = CATALOG_MOVIES_PER_PLATFORM
): Promise<MoTNMovie[]> {
  const key = env.STREAMING_AVAILABILITY_API_KEY;
  if (!key) return [];

  const results: MoTNMovie[] = [];
  let cursor: string | undefined;
  const maxPages = Math.ceil(limit / MOTN_PAGE_SIZE);

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      country,
      catalogs: serviceId,
      show_type: "movie",
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
          overview?: string;
          rating?: number;
          imageSet?: Record<string, string>;
        }>;
        hasMore: boolean;
        nextCursor?: string;
      };

      for (const show of data.shows ?? []) {
        const tmdbId = parseTmdbId(show.tmdbId ?? null);
        if (tmdbId === null) continue;
        results.push({
          tmdbId,
          title: show.title,
          releaseYear: show.releaseYear ?? null,
          overview: show.overview ?? "",
          motnRating: show.rating ?? 0,
          posterPath: extractPosterPath(show.imageSet ?? null),
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

// Keep MAX_PAGES accessible for budget documentation
export { MAX_PAGES };
