import { discoverMovies, posterUrl, type TmdbMovie } from "./tmdb";
import { getScores } from "./scores";
import { getCachedWatchProviders } from "./availability";
import { db } from "./db";
import { ratings, dismissedItems, watched, watchlist } from "./schema";
import { eq } from "drizzle-orm";
import { PLATFORM_REGISTRY, ACCESSIBLE_PROVIDER_TYPES } from "./platforms";
import {
  YEAR_PREFIX_LENGTH,
  DISCOVERY_CANDIDATE_LIMIT,
  DISCOVERY_RESULT_LIMIT,
  DISCOVERY_MIN_VOTE_AVERAGE,
  DISCOVERY_MIN_VOTE_COUNT,
} from "./config/feed";
import type { FeedItem } from "./feed-enrichment";

async function fetchCandidateBucket(params: Record<string, string>): Promise<TmdbMovie[]> {
  try {
    const result = await discoverMovies(params);
    return result.results ?? [];
  } catch {
    return [];
  }
}

/**
 * Returns top-rated movies available on streaming platforms the user does NOT
 * have. An item is only included if NONE of its providers match the user's
 * registered platforms — items accessible on a user-owned service are excluded
 * even if they're also on a non-owned one.
 */
export async function buildDiscoveryItems(
  userId: string,
  userPlatformTmdbIds: number[],
  region: string
): Promise<FeedItem[]> {
  if (userPlatformTmdbIds.length === 0) return [];

  const allTrackedIds = new Set(PLATFORM_REGISTRY.map((p) => p.tmdbId));
  const userIds = new Set(userPlatformTmdbIds);

  const [topRated, popular] = await Promise.all([
    fetchCandidateBucket({
      "vote_average.gte": DISCOVERY_MIN_VOTE_AVERAGE,
      "vote_count.gte": DISCOVERY_MIN_VOTE_COUNT,
      sort_by: "vote_average.desc",
    }),
    fetchCandidateBucket({
      sort_by: "popularity.desc",
      "vote_average.gte": "6.5",
      "vote_count.gte": "200",
    }),
  ]);

  const seen = new Set<number>();
  const allCandidates: TmdbMovie[] = [];
  for (const movie of [...topRated, ...popular]) {
    if (!seen.has(movie.id)) { seen.add(movie.id); allCandidates.push(movie); }
  }

  const [ratedRows, watchedRows, dismissedRows, watchlistRows] = await Promise.all([
    db.select({ tmdbId: ratings.tmdbId }).from(ratings).where(eq(ratings.userId, userId)),
    db.select({ tmdbId: watched.tmdbId }).from(watched).where(eq(watched.userId, userId)),
    db.select({ tmdbId: dismissedItems.tmdbId }).from(dismissedItems).where(eq(dismissedItems.userId, userId)),
    db.select({ tmdbId: watchlist.tmdbId }).from(watchlist).where(eq(watchlist.userId, userId)),
  ]);

  const excludedIds = new Set([
    ...ratedRows.map((r) => r.tmdbId),
    ...watchedRows.map((r) => r.tmdbId),
    ...dismissedRows.map((r) => r.tmdbId),
    ...watchlistRows.map((r) => r.tmdbId),
  ]);

  const unseen = allCandidates.filter((m) => !excludedIds.has(m.id));

  const withProviders = await Promise.all(
    unseen.slice(0, DISCOVERY_CANDIDATE_LIMIT).map(async (movie) => {
      try {
        const providers = await getCachedWatchProviders(movie.id, "movie", region, {
          title: movie.title,
          releaseYear: movie.release_date ? Number(movie.release_date.slice(0, YEAR_PREFIX_LENGTH)) || null : null,
          posterPath: movie.poster_path,
        });
        const userMatchIds = new Set<number>();
        const discoveryById = new Map<number, string>();
        for (const type of ACCESSIBLE_PROVIDER_TYPES) {
          for (const p of providers[type] ?? []) {
            if (userIds.has(p.provider_id)) {
              userMatchIds.add(p.provider_id);
            } else if (allTrackedIds.has(p.provider_id)) {
              discoveryById.set(p.provider_id, p.provider_name);
            }
          }
        }
        return {
          movie,
          userMatchIds,
          platforms: [...discoveryById.values()],
          platformIds: [...discoveryById.keys()],
        };
      } catch {
        return { movie, userMatchIds: new Set<number>(), platforms: [], platformIds: [] };
      }
    })
  );

  // Exclude items accessible on any user-owned platform, even if also on a non-owned one
  const discoveryCandidates = withProviders
    .filter((c) => c.userMatchIds.size === 0 && c.platforms.length > 0)
    .slice(0, DISCOVERY_RESULT_LIMIT);

  const feedItems: FeedItem[] = [];
  for (const { movie: m, platforms, platformIds } of discoveryCandidates) {
    const year = (m.release_date ?? "").slice(0, YEAR_PREFIX_LENGTH);
    const scores = await getScores(m.id, "movie", m.title, year, m.vote_average, m.vote_count, m.popularity, m.release_date ?? null);
    feedItems.push({
      tmdbId: m.id,
      tmdbType: "movie",
      title: m.title,
      year,
      posterUrl: posterUrl(m.poster_path, "w342"),
      overview: m.overview ?? "",
      originalLanguage: m.original_language,
      platforms,
      platformIds,
      audienceScore: scores.audienceScore,
      criticsScore: scores.criticsScore,
      cinemaScore: scores.cinemaScore,
      voteCount: scores.voteCount,
      ribbon: scores.ribbon,
      scoreTooltip: scores.tooltipLines,
      whyYoullLikeThis: "",
      rank: 0,
    });
  }

  return feedItems.sort((a, b) => (b.audienceScore ?? 0) - (a.audienceScore ?? 0));
}
