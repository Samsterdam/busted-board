import { db } from "./db";
import { mediaAvailability } from "./schema";
import { eq, and } from "drizzle-orm";
import { getWatchProviders, type WatchProviders } from "./tmdb";
import { upsertMedia, syncMediaLinks } from "./media-store";

/** Optional media metadata; when supplied, the normalized media/media_links
 * store is populated from the same providers payload on a fresh fetch. */
export interface MediaMeta {
  title: string;
  releaseYear?: number | null;
  posterPath?: string | null;
}

// Streaming availability shifts more often than critic scores but not by the
// hour — a day is a good balance between freshness and avoiding redundant TMDB
// calls. The cache is shared across all users in a region.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

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

  if (cached && Date.now() - cached.fetchedAt!.getTime() < CACHE_TTL_MS) {
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
