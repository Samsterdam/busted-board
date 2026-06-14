import {
  discoverMovies,
  getTrendingMovies,
  posterUrl,
  type TmdbMovie,
} from "./tmdb";
import { rankRecommendations, type TasteProfileResult, type RankedRecommendation } from "./gemini";
import { getScores } from "./scores";
import { getCachedWatchProviders, prefetchWatchProviders } from "./availability";
import { db } from "./db";
import { ratings, dismissedItems, watched, watchlist, media, mediaLinks, platforms } from "./schema";
import { eq, inArray, and } from "drizzle-orm";
import { ACCESSIBLE_PROVIDER_TYPES } from "./platforms";
import {
  YEAR_PREFIX_LENGTH,
  FEED_PROVIDER_LOOKUP_LIMIT,
  FEED_RANK_LIMIT,
  MORE_FEED_PROVIDER_LOOKUP_LIMIT,
  MORE_FEED_RESULT_LIMIT,
} from "./config/feed";
import { MOTN_RATING_DIVISOR, CATALOG_DEFAULT_RATING } from "./config/catalog";
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

// Sentinel popularity value that marks a TmdbMovie as catalog-sourced.
// These are excluded from Gemini ranking (popularity is meaningless for them)
// and sorted by motnRating after ranking instead.
const CATALOG_POPULARITY_SENTINEL = -1;

// How many DB rows to fetch per unique movie when joining through platforms.
// A movie can appear once per platform it's on, so this cap ensures we still
// get FEED_PROVIDER_LOOKUP_LIMIT unique movies when a user has many platforms.
const CATALOG_ROW_MULTIPLIER = 10;

/** A catalog movie with its platform names/IDs pre-resolved from the DB. */
interface CatalogCandidate {
  movie: TmdbMovie;
  platforms: string[];
  platformIds: number[];
}

/**
 * Query the pre-populated platform catalog DB for movie candidates on the
 * user's selected platforms. Returns CatalogCandidate objects whose platform
 * data comes directly from the DB — no TMDB watch-provider call needed.
 * Falls back to [] when the catalog is empty (e.g. before first sync).
 */
async function queryCatalogCandidates(
  userPlatformSlugs: string[],
  region: string
): Promise<CatalogCandidate[]> {
  if (userPlatformSlugs.length === 0) return [];

  try {
    // One movie can appear in multiple rows (once per user-platform it's on).
    // The cap accounts for that so we still get FEED_PROVIDER_LOOKUP_LIMIT
    // unique movies even when a user has many platforms.
    const rowCap = FEED_PROVIDER_LOOKUP_LIMIT * CATALOG_ROW_MULTIPLIER;

    const rows = await db
      .select({
        tmdbId: media.tmdbId,
        title: media.title,
        releaseYear: media.releaseYear,
        posterPath: media.posterPath,
        overview: media.overview,
        originalLanguage: media.originalLanguage,
        motnRating: media.motnRating,
        platformName: platforms.name,
        platformTmdbId: platforms.tmdbId,
      })
      .from(media)
      .innerJoin(mediaLinks, eq(mediaLinks.mediaId, media.id))
      .innerJoin(platforms, eq(platforms.id, mediaLinks.platformId))
      .where(
        and(
          inArray(platforms.slug, userPlatformSlugs),
          eq(mediaLinks.region, region)
        )
      )
      .orderBy(media.motnRating)
      .limit(rowCap);

    // Group by tmdbId: a movie on multiple user platforms appears in multiple rows.
    const byId = new Map<number, { row: typeof rows[0]; names: string[]; tmdbIds: number[] }>();
    for (const row of rows) {
      const entry = byId.get(row.tmdbId);
      if (entry) {
        if (row.platformName && !entry.names.includes(row.platformName)) entry.names.push(row.platformName);
        if (row.platformTmdbId != null && !entry.tmdbIds.includes(row.platformTmdbId)) entry.tmdbIds.push(row.platformTmdbId);
      } else {
        byId.set(row.tmdbId, {
          row,
          names: row.platformName ? [row.platformName] : [],
          tmdbIds: row.platformTmdbId != null ? [row.platformTmdbId] : [],
        });
      }
    }

    return Array.from(byId.values())
      .slice(0, FEED_PROVIDER_LOOKUP_LIMIT)
      .map(({ row: r, names, tmdbIds }) => ({
        movie: {
          id: r.tmdbId,
          title: r.title,
          release_date: r.releaseYear ? `${r.releaseYear}-01-01` : "",
          poster_path: r.posterPath ?? null,
          overview: r.overview ?? "",
          original_language: r.originalLanguage ?? "en",
          vote_average: (r.motnRating ?? CATALOG_DEFAULT_RATING) / MOTN_RATING_DIVISOR,
          vote_count: 500,
          popularity: CATALOG_POPULARITY_SENTINEL,
          genre_ids: [],
        },
        platforms: names,
        platformIds: tmdbIds,
      }));
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
  userPlatformSlugs: string[],
  region: string,
  tasteProfile: TasteProfileResult | null
): Promise<FeedItem[]> {
  const currentYear = new Date().getFullYear();
  const recentCutoff = new Date();
  recentCutoff.setMonth(recentCutoff.getMonth() - RECENT_WITHIN_MONTHS);

  const providerParam: Record<string, string> = userPlatformTmdbIds.length > 0
    ? { with_watch_providers: userPlatformTmdbIds.join("|"), watch_region: region }
    : {};

  const [catalogMovies, trending, hiddenGems, classics, recent, onPlatform] = await Promise.all([
    queryCatalogCandidates(userPlatformSlugs, region),
    getTrendingMovies().then((r) => r.results ?? []).catch(() => []),
    fetchCandidateBucket({ "vote_average.gte": "7.5", "vote_count.gte": "500", "popularity.lte": "20", sort_by: "vote_average.desc" }),
    fetchCandidateBucket({ "vote_average.gte": "7.5", "primary_release_date.lte": `${currentYear - CLASSICS_MIN_AGE_YEARS}-12-31`, sort_by: "vote_average.desc" }),
    fetchCandidateBucket({ "primary_release_date.gte": recentCutoff.toISOString().split("T")[0], sort_by: "popularity.desc" }),
    userPlatformTmdbIds.length > 0
      ? fetchCandidateBucket({ ...providerParam, sort_by: "vote_average.desc", "vote_count.gte": "50" })
      : Promise.resolve([] as TmdbMovie[]),
  ]);

  // Catalog candidates already have platform data from the DB — no TMDB call needed.
  // Non-catalog candidates are deduplicated against catalog, then TMDB-checked.
  const catalogIds = new Set(catalogMovies.map((c) => c.movie.id));
  const seen = new Set<number>(catalogIds);
  const nonCatalogMovies: TmdbMovie[] = [];
  for (const movie of [...onPlatform, ...trending, ...hiddenGems, ...classics, ...recent]) {
    if (!seen.has(movie.id)) { seen.add(movie.id); nonCatalogMovies.push(movie); }
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

  const filteredCatalog = catalogMovies.filter(
    (c) => !ratedIds.has(c.movie.id) && !watchedIds.has(c.movie.id) && !dismissedIds.has(c.movie.id) && !watchlistIds.has(c.movie.id)
  );
  const filteredNonCatalog = nonCatalogMovies.filter(
    (m) => !ratedIds.has(m.id) && !watchedIds.has(m.id) && !dismissedIds.has(m.id) && !watchlistIds.has(m.id)
  );

  // Batch-prefetch availability cache for non-catalog candidates (one DB query vs. N).
  const nonCatalogBudget = Math.max(0, FEED_PROVIDER_LOOKUP_LIMIT - filteredCatalog.length);
  const nonCatalogSlice = filteredNonCatalog.slice(0, nonCatalogBudget);
  const providerCache = await prefetchWatchProviders(
    nonCatalogSlice.map((m) => ({ tmdbId: m.id, type: "movie" as const })),
    region
  );

  const withProviders = await Promise.all(
    nonCatalogSlice.map(async (movie) => {
      try {
        const prefetched = providerCache.get(`${movie.id}:movie`);
        const providers = prefetched ?? await getCachedWatchProviders(movie.id, "movie", region, {
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

  const nonCatalogOnPlatform = withProviders.filter((c) => c.platforms.length > 0);
  const allOnPlatform = [...filteredCatalog, ...nonCatalogOnPlatform].slice(0, FEED_RANK_LIMIT);

  // Catalog-sourced movies (sentinel popularity) are excluded from Gemini ranking
  // because popularity is meaningless for them. They're appended after ranking,
  // sorted by MOTN rating descending.
  const catalogCandidates = allOnPlatform.filter((c) => c.movie.popularity === CATALOG_POPULARITY_SENTINEL);
  const rankableCandidates = allOnPlatform.filter((c) => c.movie.popularity !== CATALOG_POPULARITY_SENTINEL);

  if (allOnPlatform.length === 0) return [];

  let ranked: RankedRecommendation[];
  if (tasteProfile && rankableCandidates.length > 0) {
    ranked = await rankRecommendations(
      tasteProfile,
      rankableCandidates.map((c) => ({
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
    ranked = rankableCandidates.map((c, i) => ({
      tmdb_id: c.movie.id,
      rank: i + 1,
      why_youll_like_this: "Highly rated and available on your streaming services.",
    }));
  }

  // Append catalog movies after ranked results, sorted by MOTN rating (vote_average proxy)
  const catalogRanked: RankedRecommendation[] = catalogCandidates
    .sort((a, b) => b.movie.vote_average - a.movie.vote_average)
    .map((c, i) => ({
      tmdb_id: c.movie.id,
      rank: ranked.length + i + 1,
      why_youll_like_this: "Available on your streaming services.",
    }));

  const allRanked = [...ranked, ...catalogRanked];

  const feedItems: FeedItem[] = [];
  for (const rec of allRanked) {
    const candidate = allOnPlatform.find((c) => c.movie.id === rec.tmdb_id);
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
  userPlatformSlugs: string[],
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

  const [tmdbResult, catalogMovies] = await Promise.all([
    discoverMovies({ ...strategy, page: String(tmdbPage) }).catch(() => null),
    queryCatalogCandidates(userPlatformSlugs, region),
  ]);

  const tmdbCandidates = (tmdbResult?.results ?? []).filter(
    (m) => !seenSet.has(m.id) && !ratedIdsMore.has(m.id) && !watchedIdsMore.has(m.id) && !dismissedIds.has(m.id) && !watchlistIdsMore.has(m.id)
  );
  const filteredCatalog = catalogMovies.filter(
    (c) => !seenSet.has(c.movie.id) && !ratedIdsMore.has(c.movie.id) && !watchedIdsMore.has(c.movie.id) && !dismissedIds.has(c.movie.id) && !watchlistIdsMore.has(c.movie.id)
  );

  const catalogIdsMore = new Set(filteredCatalog.map((c) => c.movie.id));
  const filteredNonCatalog = tmdbCandidates.filter((m) => !catalogIdsMore.has(m.id));

  if (filteredCatalog.length === 0 && filteredNonCatalog.length === 0) return [];

  // Batch-prefetch availability cache for non-catalog candidates (one DB query vs. N).
  const nonCatalogBudgetMore = Math.max(0, MORE_FEED_PROVIDER_LOOKUP_LIMIT - filteredCatalog.length);
  const nonCatalogSliceMore = filteredNonCatalog.slice(0, nonCatalogBudgetMore);
  const providerCacheMore = await prefetchWatchProviders(
    nonCatalogSliceMore.map((m) => ({ tmdbId: m.id, type: "movie" as const })),
    region
  );

  const withProviders = await Promise.all(
    nonCatalogSliceMore.map(async (movie) => {
      try {
        const prefetched = providerCacheMore.get(`${movie.id}:movie`);
        const providers = prefetched ?? await getCachedWatchProviders(movie.id, "movie", region, {
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

  const nonCatalogOnPlatformMore = withProviders.filter((c) => c.platforms.length > 0);
  const onPlatforms = [...filteredCatalog, ...nonCatalogOnPlatformMore].slice(0, MORE_FEED_RESULT_LIMIT);
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
