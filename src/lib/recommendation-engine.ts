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
import { ratings, dismissedItems, watchlist } from "./schema";
import { eq } from "drizzle-orm";
import { ACCESSIBLE_PROVIDER_TYPES } from "./platforms";

export interface FeedItem {
  tmdbId: number;
  tmdbType: "movie" | "tv";
  title: string;
  year: string;
  posterUrl: string | null;
  overview: string;
  originalLanguage: string;
  platforms: string[];
  audienceScore: number | null;
  criticsScore: number | null;
  cinemaScore: number | null;
  voteCount: number | null;
  ribbon: string | null;
  scoreTooltip: string[];
  whyYoullLikeThis: string;
  rank: number;
}

async function fetchCandidateBucket(params: Record<string, string>): Promise<TmdbMovie[]> {
  try {
    const result = await discoverMovies(params);
    return result.results ?? [];
  } catch {
    return [];
  }
}

export async function buildFeed(
  userId: string,
  userPlatformTmdbIds: number[],
  region: string,
  tasteProfile: TasteProfileResult | null
): Promise<FeedItem[]> {
  const currentYear = new Date().getFullYear();
  const eighteenMonthsAgo = new Date();
  eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 18);

  const [trending, hiddenGems, classics, recent] = await Promise.all([
    getTrendingMovies().then((r) => r.results ?? []).catch(() => []),
    fetchCandidateBucket({ "vote_average.gte": "7.5", "vote_count.gte": "500", "popularity.lte": "20", sort_by: "vote_average.desc" }),
    fetchCandidateBucket({ "vote_average.gte": "7.5", "primary_release_date.lte": `${currentYear - 20}-12-31`, sort_by: "vote_average.desc" }),
    fetchCandidateBucket({ "primary_release_date.gte": eighteenMonthsAgo.toISOString().split("T")[0], sort_by: "popularity.desc" }),
  ]);

  const seen = new Set<number>();
  const allCandidates: TmdbMovie[] = [];
  for (const movie of [...trending, ...hiddenGems, ...classics, ...recent]) {
    if (!seen.has(movie.id)) { seen.add(movie.id); allCandidates.push(movie); }
  }

  const watchedRows = await db.select({ tmdbId: ratings.tmdbId }).from(ratings).where(eq(ratings.userId, userId));
  const dismissedRows = await db.select({ tmdbId: dismissedItems.tmdbId }).from(dismissedItems).where(eq(dismissedItems.userId, userId));
  const watchlistRows = await db.select({ tmdbId: watchlist.tmdbId }).from(watchlist).where(eq(watchlist.userId, userId));

  const watchedIds = new Set(watchedRows.map((r) => r.tmdbId));
  const dismissedIds = new Set(dismissedRows.map((r) => r.tmdbId));
  const watchlistIds = new Set(watchlistRows.map((r) => r.tmdbId));

  const filtered = allCandidates.filter((m) => !watchedIds.has(m.id) && !dismissedIds.has(m.id));

  const withProviders = await Promise.all(
    filtered.slice(0, 60).map(async (movie) => {
      try {
        const providers = await getCachedWatchProviders(movie.id, "movie", region, {
          title: movie.title,
          releaseYear: movie.release_date ? Number(movie.release_date.slice(0, 4)) || null : null,
          posterPath: movie.poster_path,
        });
        const available: string[] = [];
        for (const type of ACCESSIBLE_PROVIDER_TYPES) {
          for (const p of providers[type] ?? []) {
            if (userPlatformTmdbIds.includes(p.provider_id)) available.push(p.provider_name);
          }
        }
        return { movie, platforms: [...new Set(available)] };
      } catch {
        return { movie, platforms: [] };
      }
    })
  );

  const candidates = withProviders.filter((c) => c.platforms.length > 0).slice(0, 30);
  if (candidates.length === 0) return [];

  let ranked: RankedRecommendation[];
  if (tasteProfile) {
    ranked = await rankRecommendations(
      tasteProfile,
      candidates.map((c) => ({
        tmdb_id: c.movie.id,
        title: c.movie.title,
        year: (c.movie.release_date ?? "").slice(0, 4),
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
    const year = (m.release_date ?? "").slice(0, 4);
    const scores = await getScores(m.id, "movie", m.title, year, m.vote_average, m.vote_count, m.popularity, m.release_date ?? null);
    feedItems.push({
      tmdbId: m.id, tmdbType: "movie", title: m.title, year,
      posterUrl: posterUrl(m.poster_path, "w342"),
      overview: m.overview ?? "",
      originalLanguage: m.original_language,
      platforms: candidate.platforms,
      audienceScore: scores.audienceScore,
      criticsScore: scores.criticsScore,
      cinemaScore: scores.cinemaScore,
      voteCount: scores.voteCount,
      ribbon: scores.ribbon,
      scoreTooltip: scores.tooltipLines,
      whyYoullLikeThis: rec.why_youll_like_this,
      rank: rec.rank,
    });
    void watchlistIds; // used for reference elsewhere
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
  const dismissedRows = await db.select({ tmdbId: dismissedItems.tmdbId }).from(dismissedItems).where(eq(dismissedItems.userId, userId));
  const dismissedIds = new Set(dismissedRows.map((r) => r.tmdbId));

  const strategies: Record<string, string>[] = [
    { sort_by: "vote_average.desc", "vote_count.gte": "500" },
    { sort_by: "popularity.desc" },
    { sort_by: "vote_average.desc", "vote_count.gte": "200", "primary_release_date.lte": `${new Date().getFullYear() - 5}-12-31` },
    { sort_by: "primary_release_date.desc", "vote_average.gte": "6.5" },
  ];
  const strategy = strategies[(page - 2) % strategies.length];
  const tmdbPage = Math.ceil((page - 1) / strategies.length) + 1;

  let candidates: TmdbMovie[] = [];
  try {
    const result = await discoverMovies({ ...strategy, page: String(tmdbPage) });
    candidates = (result.results ?? []).filter((m) => !seenSet.has(m.id) && !dismissedIds.has(m.id));
  } catch {
    return [];
  }

  const withProviders = await Promise.all(
    candidates.slice(0, 40).map(async (movie) => {
      try {
        const providers = await getCachedWatchProviders(movie.id, "movie", region, {
          title: movie.title,
          releaseYear: movie.release_date ? Number(movie.release_date.slice(0, 4)) || null : null,
          posterPath: movie.poster_path,
        });
        const available: string[] = [];
        for (const type of ACCESSIBLE_PROVIDER_TYPES) {
          for (const p of providers[type] ?? []) {
            if (userPlatformTmdbIds.includes(p.provider_id)) available.push(p.provider_name);
          }
        }
        return { movie, platforms: [...new Set(available)] };
      } catch {
        return { movie, platforms: [] };
      }
    })
  );

  const onPlatforms = withProviders.filter((c) => c.platforms.length > 0).slice(0, 12);
  const feedItems: FeedItem[] = [];
  for (const { movie: m, platforms } of onPlatforms) {
    const year = (m.release_date ?? "").slice(0, 4);
    const scores = await getScores(m.id, "movie", m.title, year, m.vote_average, m.vote_count, m.popularity, m.release_date ?? null);
    feedItems.push({
      tmdbId: m.id, tmdbType: "movie", title: m.title, year,
      posterUrl: posterUrl(m.poster_path, "w342"),
      overview: m.overview ?? "",
      originalLanguage: m.original_language,
      platforms,
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
