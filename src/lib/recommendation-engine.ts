import {
  discoverMovies,
  getTrendingMovies,
  posterUrl,
  type TmdbMovie,
} from "./tmdb";
import { rankRecommendations, type TasteProfileResult, type RankedRecommendation } from "./gemini";
import { getScores } from "./scores";
import { getCachedWatchProviders } from "./availability";
import { db } from "./db";
import { ratings, dismissedItems, watched, watchlist } from "./schema";
import { eq } from "drizzle-orm";
import { ACCESSIBLE_PROVIDER_TYPES } from "./platforms";
import {
  YEAR_PREFIX_LENGTH,
  FEED_PROVIDER_LOOKUP_LIMIT,
  FEED_RANK_LIMIT,
  MORE_FEED_PROVIDER_LOOKUP_LIMIT,
  MORE_FEED_RESULT_LIMIT,
} from "./config/feed";
import {
  CLASSICS_MIN_AGE_YEARS,
  RECENT_WITHIN_MONTHS,
  MORE_FEED_OLD_MIN_AGE_YEARS,
} from "./config/scoring";
import type { FeedItem } from "./feed-enrichment";

// FeedItem and DiscoverResult live in feed-enrichment.ts. Re-exported here so
// existing component imports (RecommendationCard, MovieDetailModal, etc.) don't
// need to change.
export type { FeedItem, DiscoverResult } from "./feed-enrichment";

async function fetchCandidateBucket(params: Record<string, string>): Promise<TmdbMovie[]> {
  try {
    const result = await discoverMovies(params);
    return result.results ?? [];
  } catch {
    return [];
  }
}

// Note: buildFeed and buildMoreFeed are movie-only. TV recommendations in the
// main feed are a deferred feature — the quiz now collects TV signals but the
// ranking pipeline only sources from TMDB movie endpoints.
export async function buildFeed(
  userId: string,
  userPlatformTmdbIds: number[],
  region: string,
  tasteProfile: TasteProfileResult | null
): Promise<FeedItem[]> {
  const currentYear = new Date().getFullYear();
  const recentCutoff = new Date();
  recentCutoff.setMonth(recentCutoff.getMonth() - RECENT_WITHIN_MONTHS);

  const providerParam: Record<string, string> = userPlatformTmdbIds.length > 0
    ? { with_watch_providers: userPlatformTmdbIds.join("|"), watch_region: region }
    : {};

  const [trending, hiddenGems, classics, recent, onPlatform] = await Promise.all([
    getTrendingMovies().then((r) => r.results ?? []).catch(() => []),
    fetchCandidateBucket({ "vote_average.gte": "7.5", "vote_count.gte": "500", "popularity.lte": "20", sort_by: "vote_average.desc" }),
    fetchCandidateBucket({ "vote_average.gte": "7.5", "primary_release_date.lte": `${currentYear - CLASSICS_MIN_AGE_YEARS}-12-31`, sort_by: "vote_average.desc" }),
    fetchCandidateBucket({ "primary_release_date.gte": recentCutoff.toISOString().split("T")[0], sort_by: "popularity.desc" }),
    userPlatformTmdbIds.length > 0
      ? fetchCandidateBucket({ ...providerParam, sort_by: "vote_average.desc", "vote_count.gte": "50" })
      : Promise.resolve([] as TmdbMovie[]),
  ]);

  const seen = new Set<number>();
  const allCandidates: TmdbMovie[] = [];
  // onPlatform first so provider-confirmed titles fill the lookup budget before generic buckets
  for (const movie of [...onPlatform, ...trending, ...hiddenGems, ...classics, ...recent]) {
    if (!seen.has(movie.id)) { seen.add(movie.id); allCandidates.push(movie); }
  }

  const [ratedRows, watchedRows, dismissedRows, watchlistRows] = await Promise.all([
    db.select({ tmdbId: ratings.tmdbId }).from(ratings).where(eq(ratings.userId, userId)),
    db.select({ tmdbId: watched.tmdbId }).from(watched).where(eq(watched.userId, userId)),
    db.select({ tmdbId: dismissedItems.tmdbId }).from(dismissedItems).where(eq(dismissedItems.userId, userId)),
    db.select({ tmdbId: watchlist.tmdbId }).from(watchlist).where(eq(watchlist.userId, userId)),
  ]);

  const ratedIds = new Set(ratedRows.map((r) => r.tmdbId));
  const watchedIds = new Set(watchedRows.map((r) => r.tmdbId));
  const dismissedIds = new Set(dismissedRows.map((r) => r.tmdbId));
  const watchlistIds = new Set(watchlistRows.map((r) => r.tmdbId));

  const filtered = allCandidates.filter((m) => !ratedIds.has(m.id) && !watchedIds.has(m.id) && !dismissedIds.has(m.id) && !watchlistIds.has(m.id));

  const withProviders = await Promise.all(
    filtered.slice(0, FEED_PROVIDER_LOOKUP_LIMIT).map(async (movie) => {
      try {
        const providers = await getCachedWatchProviders(movie.id, "movie", region, {
          title: movie.title,
          releaseYear: movie.release_date ? Number(movie.release_date.slice(0, YEAR_PREFIX_LENGTH)) || null : null,
          posterPath: movie.poster_path,
        });
        const byId = new Map<number, string>();
        for (const type of ACCESSIBLE_PROVIDER_TYPES) {
          for (const p of providers[type] ?? []) {
            if (userPlatformTmdbIds.includes(p.provider_id)) byId.set(p.provider_id, p.provider_name);
          }
        }
        return { movie, platforms: [...byId.values()], platformIds: [...byId.keys()] };
      } catch {
        return { movie, platforms: [], platformIds: [] };
      }
    })
  );

  const candidates = withProviders.filter((c) => c.platforms.length > 0).slice(0, FEED_RANK_LIMIT);
  if (candidates.length === 0) return [];

  let ranked: RankedRecommendation[];
  if (tasteProfile) {
    ranked = await rankRecommendations(
      tasteProfile,
      candidates.map((c) => ({
        tmdb_id: c.movie.id,
        title: c.movie.title,
        year: (c.movie.release_date ?? "").slice(0, YEAR_PREFIX_LENGTH),
        genres: [],
        overview: c.movie.overview ?? "",
        vote_average: c.movie.vote_average,
        popularity: c.movie.popularity,
        original_language: c.movie.original_language,
        platforms: c.platforms,
      }))
    );
  } else {
    ranked = candidates.map((c, i) => ({
      tmdb_id: c.movie.id,
      rank: i + 1,
      why_youll_like_this: "Highly rated and available on your streaming services.",
    }));
  }

  const feedItems: FeedItem[] = [];
  for (const rec of ranked) {
    const candidate = candidates.find((c) => c.movie.id === rec.tmdb_id);
    if (!candidate) continue;
    const m = candidate.movie;
    const year = (m.release_date ?? "").slice(0, YEAR_PREFIX_LENGTH);
    const scores = await getScores(m.id, "movie", m.title, year, m.vote_average, m.vote_count, m.popularity, m.release_date ?? null);
    feedItems.push({
      tmdbId: m.id, tmdbType: "movie", title: m.title, year,
      posterUrl: posterUrl(m.poster_path, "w342"),
      overview: m.overview ?? "",
      originalLanguage: m.original_language,
      platforms: candidate.platforms,
      platformIds: candidate.platformIds,
      audienceScore: scores.audienceScore,
      criticsScore: scores.criticsScore,
      cinemaScore: scores.cinemaScore,
      voteCount: scores.voteCount,
      ribbon: scores.ribbon,
      scoreTooltip: scores.tooltipLines,
      whyYoullLikeThis: rec.why_youll_like_this,
      rank: rec.rank,
    });
  }

  return feedItems.sort((a, b) => a.rank - b.rank);
}

export async function buildMoreFeed(
  userId: string,
  userPlatformTmdbIds: number[],
  region: string,
  seenIds: number[],
  page: number
): Promise<FeedItem[]> {
  const seenSet = new Set(seenIds);
  const [ratedRowsMore, watchedRowsMore, dismissedRows, watchlistRowsMore] = await Promise.all([
    db.select({ tmdbId: ratings.tmdbId }).from(ratings).where(eq(ratings.userId, userId)),
    db.select({ tmdbId: watched.tmdbId }).from(watched).where(eq(watched.userId, userId)),
    db.select({ tmdbId: dismissedItems.tmdbId }).from(dismissedItems).where(eq(dismissedItems.userId, userId)),
    db.select({ tmdbId: watchlist.tmdbId }).from(watchlist).where(eq(watchlist.userId, userId)),
  ]);
  const ratedIdsMore = new Set(ratedRowsMore.map((r) => r.tmdbId));
  const watchedIdsMore = new Set(watchedRowsMore.map((r) => r.tmdbId));
  const dismissedIds = new Set(dismissedRows.map((r) => r.tmdbId));
  const watchlistIdsMore = new Set(watchlistRowsMore.map((r) => r.tmdbId));

  const providerParam: Record<string, string> = userPlatformTmdbIds.length > 0
    ? { with_watch_providers: userPlatformTmdbIds.join("|"), watch_region: region }
    : {};

  const strategies: Record<string, string>[] = [
    { ...providerParam, sort_by: "vote_average.desc", "vote_count.gte": "500" },
    { ...providerParam, sort_by: "popularity.desc" },
    { ...providerParam, sort_by: "vote_average.desc", "vote_count.gte": "200", "primary_release_date.lte": `${new Date().getFullYear() - MORE_FEED_OLD_MIN_AGE_YEARS}-12-31` },
    { ...providerParam, sort_by: "primary_release_date.desc", "vote_average.gte": "6.5" },
  ];
  const strategy = strategies[(page - 2) % strategies.length];
  const tmdbPage = Math.ceil((page - 1) / strategies.length) + 1;

  let candidates: TmdbMovie[] = [];
  try {
    const result = await discoverMovies({ ...strategy, page: String(tmdbPage) });
    candidates = (result.results ?? []).filter(
      (m) => !seenSet.has(m.id) && !ratedIdsMore.has(m.id) && !watchedIdsMore.has(m.id) && !dismissedIds.has(m.id) && !watchlistIdsMore.has(m.id)
    );
  } catch {
    return [];
  }

  const withProviders = await Promise.all(
    candidates.slice(0, MORE_FEED_PROVIDER_LOOKUP_LIMIT).map(async (movie) => {
      try {
        const providers = await getCachedWatchProviders(movie.id, "movie", region, {
          title: movie.title,
          releaseYear: movie.release_date ? Number(movie.release_date.slice(0, YEAR_PREFIX_LENGTH)) || null : null,
          posterPath: movie.poster_path,
        });
        const byId = new Map<number, string>();
        for (const type of ACCESSIBLE_PROVIDER_TYPES) {
          for (const p of providers[type] ?? []) {
            if (userPlatformTmdbIds.includes(p.provider_id)) byId.set(p.provider_id, p.provider_name);
          }
        }
        return { movie, platforms: [...byId.values()], platformIds: [...byId.keys()] };
      } catch {
        return { movie, platforms: [], platformIds: [] };
      }
    })
  );

  const onPlatforms = withProviders.filter((c) => c.platforms.length > 0).slice(0, MORE_FEED_RESULT_LIMIT);
  const feedItems: FeedItem[] = [];
  for (const { movie: m, platforms, platformIds } of onPlatforms) {
    const year = (m.release_date ?? "").slice(0, YEAR_PREFIX_LENGTH);
    const scores = await getScores(m.id, "movie", m.title, year, m.vote_average, m.vote_count, m.popularity, m.release_date ?? null);
    feedItems.push({
      tmdbId: m.id, tmdbType: "movie", title: m.title, year,
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
      rank: 999,
    });
  }

  return feedItems.sort((a, b) => (b.audienceScore ?? 0) - (a.audienceScore ?? 0));
}
