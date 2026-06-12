import {
  discoverMovies,
  getTrendingMovies,
  getWatchProviders,
  posterUrl,
  type TmdbMovie,
} from "./tmdb";
import { rankRecommendations, type TasteProfileResult, type RankedRecommendation } from "./gemini";
import { getScores } from "./scores";
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

  // Fetch 4 buckets in parallel for variety
  const [trending, hiddenGems, classics, recent] = await Promise.all([
    getTrendingMovies().then((r) => r.results ?? []).catch(() => []),
    fetchCandidateBucket({
      "vote_average.gte": "7.5",
      "vote_count.gte": "500",
      "popularity.lte": "20",
      sort_by: "vote_average.desc",
    }),
    fetchCandidateBucket({
      "vote_average.gte": "7.5",
      "primary_release_date.lte": `${currentYear - 20}-12-31`,
      sort_by: "vote_average.desc",
    }),
    fetchCandidateBucket({
      "primary_release_date.gte": eighteenMonthsAgo.toISOString().split("T")[0],
      sort_by: "popularity.desc",
    }),
  ]);

  // Deduplicate across buckets
  const seen = new Set<number>();
  const allCandidates: TmdbMovie[] = [];
  for (const movie of [...trending, ...hiddenGems, ...classics, ...recent]) {
    if (!seen.has(movie.id)) {
      seen.add(movie.id);
      allCandidates.push(movie);
    }
  }

  // Get user's watched + dismissed IDs to filter out
  const watchedIds = new Set(
    db.select({ tmdbId: ratings.tmdbId }).from(ratings).where(eq(ratings.userId, userId)).all().map((r) => r.tmdbId)
  );
  const dismissedIds = new Set(
    db.select({ tmdbId: dismissedItems.tmdbId }).from(dismissedItems).where(eq(dismissedItems.userId, userId)).all().map((r) => r.tmdbId)
  );
  const watchlistIds = new Set(
    db.select({ tmdbId: watchlist.tmdbId }).from(watchlist).where(eq(watchlist.userId, userId)).all().map((r) => r.tmdbId)
  );

  const filtered = allCandidates.filter(
    (m) => !watchedIds.has(m.id) && !dismissedIds.has(m.id)
  );

  // Check platform availability for each candidate
  const withProviders = await Promise.all(
    filtered.slice(0, 60).map(async (movie) => {
      try {
        const providers = await getWatchProviders(movie.id, "movie", region);
        const available: string[] = [];
        for (const type of ACCESSIBLE_PROVIDER_TYPES) {
          for (const p of providers[type] ?? []) {
            if (userPlatformTmdbIds.includes(p.provider_id)) {
              available.push(p.provider_name);
            }
          }
        }
        return { movie, platforms: [...new Set(available)] };
      } catch {
        return { movie, platforms: [] };
      }
    })
  );

  const onUserPlatforms = withProviders.filter((c) => c.platforms.length > 0);
  const candidates = onUserPlatforms.slice(0, 30);

  if (candidates.length === 0) return [];

  // Rank with Gemini (or fall back to vote_average sort)
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

  // Build final feed items with scores
  const feedItems: FeedItem[] = [];
  for (const rec of ranked) {
    const candidate = candidates.find((c) => c.movie.id === rec.tmdb_id);
    if (!candidate) continue;

    const m = candidate.movie;
    const year = (m.release_date ?? "").slice(0, 4);

    const scores = await getScores(
      m.id,
      "movie",
      m.title,
      year,
      m.vote_average,
      m.vote_count,
      m.popularity,
      m.release_date ?? null
    );

    feedItems.push({
      tmdbId: m.id,
      tmdbType: "movie",
      title: m.title,
      year,
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
      // Mark if in watchlist
      ...( watchlistIds.has(m.id) ? {} : {} ),
    });
  }

  return feedItems.sort((a, b) => a.rank - b.rank);
}
