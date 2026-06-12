import { db } from "./db";
import { mediaAvailability } from "./schema";
import { eq, and } from "drizzle-orm";
import { getWatchProviders, type WatchProviders } from "./tmdb";

// Streaming availability shifts more often than critic scores but not by the
// hour — a day is a good balance between freshness and avoiding redundant TMDB
// calls. The cache is shared across all users in a region.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Region-aware, cross-user cache around TMDB watch providers. Returns the same
 * `WatchProviders` shape as `getWatchProviders`, so it's a drop-in replacement.
 * On a cache miss the live result is fetched and written back best-effort; a
 * cache write failure never fails the request (the live data is still returned).
 */
export async function getCachedWatchProviders(
  tmdbId: number,
  type: "movie" | "tv",
  region: string
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

  return providers;
}
