import { db } from "./db";
import { mediaAvailability } from "./schema";
import { eq, and, inArray } from "drizzle-orm";
import { getWatchProviders, type WatchProviders } from "./tmdb";
import { upsertMedia, syncMediaLinks } from "./media-store";
import { AVAILABILITY_CACHE_TTL_MS } from "./config/durations";

/** Optional media metadata; when supplied, the normalized media/media_links
 * store is populated from the same providers payload on a fresh fetch. */
export interface MediaMeta {
  title: string;
  releaseYear?: number | null;
  posterPath?: string | null;
}

// Streaming availability shifts more often than critic scores but not by the
// hour — a day is a good balance between freshness and avoiding redundant TMDB
// calls. The cache is shared across all users in a region. (TTL: see config.)

/**
 * Region-aware, cross-user cache around TMDB watch providers. Returns the same
 * `WatchProviders` shape as `getWatchProviders`, so it's a drop-in replacement.
 * On a cache miss the live result is fetched and written back best-effort; a
 * cache write failure never fails the request (the live data is still returned).
 *
 * When `mediaMeta` is supplied, the normalized media/platforms/media_links store
 * is also populated on a fresh fetch (sync-on-refresh) from the same payload —
 * no extra TMDB calls. Omit it to use this purely as the availability cache.
 */
export async function getCachedWatchProviders(
  tmdbId: number,
  type: "movie" | "tv",
  region: string,
  mediaMeta?: MediaMeta
): Promise<WatchProviders> {
  const [cached] = await db
    .select()
    .from(mediaAvailability)
    .where(
      and(
        eq(mediaAvailability.tmdbId, tmdbId),
        eq(mediaAvailability.tmdbType, type),
        eq(mediaAvailability.region, region)
      )
    )
    .limit(1);

  if (cached && Date.now() - cached.fetchedAt!.getTime() < AVAILABILITY_CACHE_TTL_MS) {
    return JSON.parse(cached.providers) as WatchProviders;
  }

  const providers = await getWatchProviders(tmdbId, type, region);

  const row = { tmdbId, tmdbType: type, region, providers: JSON.stringify(providers), fetchedAt: new Date() };
  try {
    if (cached) {
      await db
        .update(mediaAvailability)
        .set(row)
        .where(
          and(
            eq(mediaAvailability.tmdbId, tmdbId),
            eq(mediaAvailability.tmdbType, type),
            eq(mediaAvailability.region, region)
          )
        );
    } else {
      await db.insert(mediaAvailability).values(row);
    }
  } catch {
    // Best-effort cache write; ignore and return the live result.
  }

  // Populate the normalized store from the same fresh payload (sync-on-refresh).
  // Best-effort and only when the caller passed media metadata; never blocks the
  // request and never triggers another TMDB call.
  if (mediaMeta) {
    try {
      const mediaId = await upsertMedia({ tmdbId, tmdbType: type, ...mediaMeta });
      if (mediaId != null) await syncMediaLinks(mediaId, region, providers);
    } catch {
      // Best-effort normalized write; ignore.
    }
  }

  return providers;
}

/**
 * Batch-fetch cached availability rows for a set of candidates in one DB
 * query. Returns a Map keyed by `"${tmdbId}:${type}"` containing only
 * non-expired entries — the caller should fall back to `getCachedWatchProviders`
 * for keys missing from the map. Never throws; returns an empty Map on error.
 */
export async function prefetchWatchProviders(
  candidates: Array<{ tmdbId: number; type: "movie" | "tv" }>,
  region: string
): Promise<Map<string, WatchProviders>> {
  if (candidates.length === 0) return new Map();
  try {
    const ids = candidates.map((c) => c.tmdbId);
    const rows = await db
      .select()
      .from(mediaAvailability)
      .where(
        and(
          inArray(mediaAvailability.tmdbId, ids),
          eq(mediaAvailability.region, region)
        )
      );

    const now = Date.now();
    const result = new Map<string, WatchProviders>();
    for (const row of rows) {
      if (now - row.fetchedAt!.getTime() < AVAILABILITY_CACHE_TTL_MS) {
        result.set(`${row.tmdbId}:${row.tmdbType}`, JSON.parse(row.providers) as WatchProviders);
      }
    }
    return result;
  } catch {
    return new Map();
  }
}
