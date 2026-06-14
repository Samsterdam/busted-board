import {
  discoverMovies,
  discoverShows,
  getTrendingMovies,
  posterUrl,
  type TmdbMovie,
  type TmdbShow,
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
import {
  MOTN_RATING_DIVISOR,
  CATALOG_DEFAULT_RATING,
  CATALOG_TV_FEED_MAX_RATIO,
} from "./config/catalog";
import {
  CLASSICS_MIN_AGE_YEARS,
  RECENT_WITHIN_MONTHS,
  MORE_FEED_OLD_MIN_AGE_YEARS,
} from "./config/scoring";
import { BINGEABLE_MIN_VOTES } from "./collections";
import {
  type DiscoverResult,
  type FeedItem,
  titleOf,
  releaseDateOf,
} from "./feed-enrichment";

// Re-exported for existing component imports that don't need to change.
export type { FeedItem, DiscoverResult } from "./feed-enrichment";

// Sentinel: marks a candidate as catalog-sourced (popularity field is meaningless).
// Catalog items skip Gemini ranking and are sorted by motnRating instead.
const CATALOG_POPULARITY_SENTINEL = -1;

// How many DB rows to fetch per unique title when joining through platforms.
const CATALOG_ROW_MULTIPLIER = 10;

// Vote count placeholder for catalog-sourced items (satisfies downstream filters).
const CATALOG_VOTE_COUNT_PLACEHOLDER = 500;

interface CatalogCandidate {
  item: DiscoverResult;
  platforms: string[];
  platformIds: number[];
}

async function fetchMovieBucket(params: Record<string, string>): Promise<(TmdbMovie & { media_type: "movie" })[]> {
  try {
    const result = await discoverMovies(params);
    return (result.results ?? []).map((r) => ({ ...r, media_type: "movie" as const }));
  } catch {
    return [];
  }
}

async function fetchShowBucket(params: Record<string, string>): Promise<(TmdbShow & { media_type: "tv" })[]> {
  try {
    const result = await discoverShows(params);
    return (result.results ?? []).map((r) => ({ ...r, media_type: "tv" as const }));
  } catch {
    return [];
  }
}

/**
 * Query the pre-populated platform catalog for candidates on the user's platforms.
 * Returns items of both types (movie + TV), capped so TV ≤ CATALOG_TV_FEED_MAX_RATIO of total.
 * Falls back to [] when the catalog is empty (before first sync).
 */
async function queryCatalogCandidates(
  userPlatformSlugs: string[],
  region: string
): Promise<CatalogCandidate[]> {
  if (userPlatformSlugs.length === 0) return [];

  try {
    const rowCap = FEED_PROVIDER_LOOKUP_LIMIT * CATALOG_ROW_MULTIPLIER;

    const rows = await db
      .select({
        tmdbId: media.tmdbId,
        tmdbType: media.tmdbType,
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
      .where(and(inArray(platforms.slug, userPlatformSlugs), eq(mediaLinks.region, region)))
      .orderBy(media.motnRating)
      .limit(rowCap);

    // Group by (tmdbId, tmdbType): a title on multiple platforms appears in multiple rows.
    const byKey = new Map<string, { row: typeof rows[0]; names: string[]; tmdbIds: number[] }>();
    for (const row of rows) {
      const key = `${row.tmdbType}:${row.tmdbId}`;
      const entry = byKey.get(key);
      if (entry) {
        if (row.platformName && !entry.names.includes(row.platformName)) entry.names.push(row.platformName);
        if (row.platformTmdbId != null && !entry.tmdbIds.includes(row.platformTmdbId)) entry.tmdbIds.push(row.platformTmdbId);
      } else {
        byKey.set(key, {
          row,
          names: row.platformName ? [row.platformName] : [],
          tmdbIds: row.platformTmdbId != null ? [row.platformTmdbId] : [],
        });
      }
    }

    const allUnique = Array.from(byKey.values());
    // Balance: TV shows must not exceed CATALOG_TV_FEED_MAX_RATIO of the total output.
    const maxTotal = FEED_PROVIDER_LOOKUP_LIMIT;
    const maxTV = Math.floor(maxTotal * CATALOG_TV_FEED_MAX_RATIO);
    let movieCount = 0;
    let tvCount = 0;
    const balanced: typeof allUnique = [];
    for (const entry of allUnique) {
      if (balanced.length >= maxTotal) break;
      if (entry.row.tmdbType === "tv") {
        if (tvCount >= maxTV) continue;
        tvCount++;
      } else {
        movieCount++;
      }
      balanced.push(entry);
    }
    // suppress unused warning
    void movieCount;

    return balanced.map(({ row: r, names, tmdbIds }) => {
      const voteAvg = (r.motnRating ?? CATALOG_DEFAULT_RATING) / MOTN_RATING_DIVISOR;
      const item: DiscoverResult = r.tmdbType === "tv"
        ? {
            id: r.tmdbId, media_type: "tv",
            name: r.title,
            first_air_date: r.releaseYear ? `${r.releaseYear}-01-01` : "",
            poster_path: r.posterPath ?? null,
            overview: r.overview ?? "",
            original_language: r.originalLanguage ?? "en",
            vote_average: voteAvg,
            vote_count: CATALOG_VOTE_COUNT_PLACEHOLDER,
            popularity: CATALOG_POPULARITY_SENTINEL,
            genre_ids: [],
          }
        : {
            id: r.tmdbId, media_type: "movie",
            title: r.title,
            release_date: r.releaseYear ? `${r.releaseYear}-01-01` : "",
            poster_path: r.posterPath ?? null,
            overview: r.overview ?? "",
            original_language: r.originalLanguage ?? "en",
            vote_average: voteAvg,
            vote_count: CATALOG_VOTE_COUNT_PLACEHOLDER,
            popularity: CATALOG_POPULARITY_SENTINEL,
            genre_ids: [],
          };
      return { item, platforms: names, platformIds: tmdbIds };
    });
  } catch {
    return [];
  }
}

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

  const [catalogItems, trendingMovies, hiddenGems, classics, recentMovies, onPlatformMovies,
         acclaimedTV, trendingTV, recentTV] = await Promise.all([
    queryCatalogCandidates(userPlatformSlugs, region),
    getTrendingMovies().then((r) => (r.results ?? []).map((m) => ({ ...m, media_type: "movie" as const }))).catch(() => [] as (TmdbMovie & { media_type: "movie" })[]),
    fetchMovieBucket({ "vote_average.gte": "7.5", "vote_count.gte": "500", "popularity.lte": "20", sort_by: "vote_average.desc" }),
    fetchMovieBucket({ "vote_average.gte": "7.5", "primary_release_date.lte": `${currentYear - CLASSICS_MIN_AGE_YEARS}-12-31`, sort_by: "vote_average.desc" }),
    fetchMovieBucket({ "primary_release_date.gte": recentCutoff.toISOString().split("T")[0], sort_by: "popularity.desc" }),
    userPlatformTmdbIds.length > 0 ? fetchMovieBucket({ ...providerParam, sort_by: "vote_average.desc", "vote_count.gte": "50" }) : Promise.resolve([] as (TmdbMovie & { media_type: "movie" })[]),
    fetchShowBucket({ "vote_average.gte": "7.5", "vote_count.gte": "500", sort_by: "vote_average.desc", ...providerParam }),
    fetchShowBucket({ sort_by: "popularity.desc", "vote_count.gte": "100", ...providerParam }),
    fetchShowBucket({ "first_air_date.gte": recentCutoff.toISOString().split("T")[0], sort_by: "popularity.desc", ...providerParam }),
  ]);

  // Dedup using composite "type:id" keys — prevents movie/TV ID collisions.
  const catalogKeys = new Set(catalogItems.map((c) => `${c.item.media_type}:${c.item.id}`));
  const seen = new Set<string>(catalogKeys);
  const nonCatalog: DiscoverResult[] = [];
  for (const r of [...onPlatformMovies, ...trendingMovies, ...hiddenGems, ...classics, ...recentMovies,
                    ...acclaimedTV, ...trendingTV, ...recentTV]) {
    const key = `${r.media_type}:${r.id}`;
    if (!seen.has(key)) { seen.add(key); nonCatalog.push(r); }
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

  const filteredCatalog = catalogItems.filter(
    (c) => !ratedIds.has(c.item.id) && !watchedIds.has(c.item.id) && !dismissedIds.has(c.item.id) && !watchlistIds.has(c.item.id)
  );
  const filteredNonCatalog = nonCatalog.filter(
    (r) => !ratedIds.has(r.id) && !watchedIds.has(r.id) && !dismissedIds.has(r.id) && !watchlistIds.has(r.id)
  );

  const nonCatalogBudget = Math.max(0, FEED_PROVIDER_LOOKUP_LIMIT - filteredCatalog.length);
  const nonCatalogSlice = filteredNonCatalog.slice(0, nonCatalogBudget);

  const providerCache = await prefetchWatchProviders(
    nonCatalogSlice.map((r) => ({ tmdbId: r.id, type: r.media_type })),
    region
  );

  const withProviders = await Promise.all(
    nonCatalogSlice.map(async (r) => {
      try {
        const cacheKey = `${r.id}:${r.media_type}`;
        const prefetched = providerCache.get(cacheKey);
        const providers = prefetched ?? await getCachedWatchProviders(r.id, r.media_type, region, {
          title: titleOf(r),
          releaseYear: releaseDateOf(r) ? Number(releaseDateOf(r).slice(0, YEAR_PREFIX_LENGTH)) || null : null,
          posterPath: r.poster_path,
        });
        const byId = new Map<number, string>();
        for (const type of ACCESSIBLE_PROVIDER_TYPES) {
          for (const p of providers[type] ?? []) {
            if (userPlatformTmdbIds.includes(p.provider_id)) byId.set(p.provider_id, p.provider_name);
          }
        }
        return { item: r, platforms: [...byId.values()], platformIds: [...byId.keys()] } as CatalogCandidate;
      } catch {
        return { item: r, platforms: [], platformIds: [] } as CatalogCandidate;
      }
    })
  );

  const nonCatalogOnPlatform = withProviders.filter((c) => c.platforms.length > 0);
  const allOnPlatform = [...filteredCatalog, ...nonCatalogOnPlatform].slice(0, FEED_RANK_LIMIT);
  if (allOnPlatform.length === 0) return [];

  const catalogCandidates = allOnPlatform.filter((c) => c.item.popularity === CATALOG_POPULARITY_SENTINEL);
  const rankableCandidates = allOnPlatform.filter((c) => c.item.popularity !== CATALOG_POPULARITY_SENTINEL);

  let ranked: RankedRecommendation[];
  if (tasteProfile && rankableCandidates.length > 0) {
    ranked = await rankRecommendations(
      tasteProfile,
      rankableCandidates.map((c) => ({
        tmdb_id: c.item.id,
        title: titleOf(c.item),
        year: releaseDateOf(c.item).slice(0, YEAR_PREFIX_LENGTH),
        genres: [],
        overview: c.item.overview ?? "",
        vote_average: c.item.vote_average,
        popularity: c.item.popularity,
        original_language: c.item.original_language,
        platforms: c.platforms,
      }))
    );
  } else {
    ranked = rankableCandidates.map((c, i) => ({
      tmdb_id: c.item.id,
      rank: i + 1,
      why_youll_like_this: "Highly rated and available on your streaming services.",
    }));
  }

  const catalogRanked: RankedRecommendation[] = catalogCandidates
    .sort((a, b) => b.item.vote_average - a.item.vote_average)
    .map((c, i) => ({
      tmdb_id: c.item.id,
      rank: ranked.length + i + 1,
      why_youll_like_this: "Available on your streaming services.",
    }));

  const allRanked = [...ranked, ...catalogRanked];
  const feedItems: FeedItem[] = [];

  for (const rec of allRanked) {
    const candidate = allOnPlatform.find((c) => c.item.id === rec.tmdb_id);
    if (!candidate) continue;
    const r = candidate.item;
    const title = titleOf(r);
    const dateStr = releaseDateOf(r);
    const year = dateStr.slice(0, YEAR_PREFIX_LENGTH);
    const scores = await getScores(r.id, r.media_type, title, year, r.vote_average, r.vote_count, r.popularity, dateStr || null);
    const item: FeedItem = {
      tmdbId: r.id, tmdbType: r.media_type, title, year,
      posterUrl: posterUrl(r.poster_path, "w342"),
      overview: r.overview ?? "",
      originalLanguage: r.original_language,
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
    };
    // Bingeable ribbon: TV shows with high vote counts get tagged as bingeable.
    if (item.tmdbType === "tv" && !item.ribbon && (item.voteCount ?? 0) >= Number(BINGEABLE_MIN_VOTES)) {
      item.ribbon = "bingeable";
    }
    feedItems.push(item);
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

  // 6 strategies: alternating movie/TV each page
  const strategies: Array<{ fn: "movie" | "tv"; params: Record<string, string> }> = [
    { fn: "movie", params: { ...providerParam, sort_by: "vote_average.desc", "vote_count.gte": "500" } },
    { fn: "tv",    params: { ...providerParam, sort_by: "vote_average.desc", "vote_count.gte": "500" } },
    { fn: "movie", params: { ...providerParam, sort_by: "popularity.desc" } },
    { fn: "tv",    params: { ...providerParam, sort_by: "popularity.desc" } },
    { fn: "movie", params: { ...providerParam, sort_by: "vote_average.desc", "vote_count.gte": "200", "primary_release_date.lte": `${new Date().getFullYear() - MORE_FEED_OLD_MIN_AGE_YEARS}-12-31` } },
    { fn: "tv",    params: { ...providerParam, sort_by: "primary_release_date.desc", "vote_average.gte": "6.5" } },
  ];
  const { fn, params } = strategies[(page - 2) % strategies.length];
  const tmdbPage = Math.ceil((page - 1) / strategies.length) + 1;

  const isExcluded = (id: number) => seenSet.has(id) || ratedIdsMore.has(id) || watchedIdsMore.has(id) || dismissedIds.has(id) || watchlistIdsMore.has(id);

  const [tmdbResults, catalogItems] = await Promise.all([
    fn === "movie"
      ? fetchMovieBucket({ ...params, page: String(tmdbPage) })
      : fetchShowBucket({ ...params, page: String(tmdbPage) }),
    queryCatalogCandidates(userPlatformSlugs, region),
  ]);

  const filteredCatalog = catalogItems.filter((c) => !isExcluded(c.item.id));
  const filteredTmdb = (tmdbResults as DiscoverResult[]).filter((r) => !isExcluded(r.id));
  const catalogIds = new Set(filteredCatalog.map((c) => c.item.id));
  const uniqueTmdb = filteredTmdb.filter((r) => !catalogIds.has(r.id));

  if (filteredCatalog.length === 0 && uniqueTmdb.length === 0) return [];

  const nonCatalogBudget = Math.max(0, MORE_FEED_PROVIDER_LOOKUP_LIMIT - filteredCatalog.length);
  const nonCatalogSlice = uniqueTmdb.slice(0, nonCatalogBudget);
  const providerCacheMore = await prefetchWatchProviders(
    nonCatalogSlice.map((r) => ({ tmdbId: r.id, type: r.media_type })),
    region
  );

  const withProviders = await Promise.all(
    nonCatalogSlice.map(async (r) => {
      try {
        const prefetched = providerCacheMore.get(`${r.id}:${r.media_type}`);
        const providers = prefetched ?? await getCachedWatchProviders(r.id, r.media_type, region, {
          title: titleOf(r),
          releaseYear: releaseDateOf(r) ? Number(releaseDateOf(r).slice(0, YEAR_PREFIX_LENGTH)) || null : null,
          posterPath: r.poster_path,
        });
        const byId = new Map<number, string>();
        for (const type of ACCESSIBLE_PROVIDER_TYPES) {
          for (const p of providers[type] ?? []) {
            if (userPlatformTmdbIds.includes(p.provider_id)) byId.set(p.provider_id, p.provider_name);
          }
        }
        return { item: r, platforms: [...byId.values()], platformIds: [...byId.keys()] } as CatalogCandidate;
      } catch {
        return { item: r, platforms: [], platformIds: [] } as CatalogCandidate;
      }
    })
  );

  const onPlatforms = [...filteredCatalog, ...withProviders.filter((c) => c.platforms.length > 0)].slice(0, MORE_FEED_RESULT_LIMIT);
  const feedItems: FeedItem[] = [];
  for (const candidate of onPlatforms) {
    const r = candidate.item;
    const title = titleOf(r);
    const dateStr = releaseDateOf(r);
    const year = dateStr.slice(0, YEAR_PREFIX_LENGTH);
    const scores = await getScores(r.id, r.media_type, title, year, r.vote_average, r.vote_count, r.popularity, dateStr || null);
    const item: FeedItem = {
      tmdbId: r.id, tmdbType: r.media_type, title, year,
      posterUrl: posterUrl(r.poster_path, "w342"),
      overview: r.overview ?? "",
      originalLanguage: r.original_language,
      platforms: candidate.platforms,
      platformIds: candidate.platformIds,
      audienceScore: scores.audienceScore,
      criticsScore: scores.criticsScore,
      cinemaScore: scores.cinemaScore,
      voteCount: scores.voteCount,
      ribbon: scores.ribbon,
      scoreTooltip: scores.tooltipLines,
      whyYoullLikeThis: "",
      rank: 999,
    };
    if (item.tmdbType === "tv" && !item.ribbon && (item.voteCount ?? 0) >= Number(BINGEABLE_MIN_VOTES)) {
      item.ribbon = "bingeable";
    }
    feedItems.push(item);
  }

  return feedItems.sort((a, b) => (b.audienceScore ?? 0) - (a.audienceScore ?? 0));
}
