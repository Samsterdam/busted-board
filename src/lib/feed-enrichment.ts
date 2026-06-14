import { posterUrl, type TmdbMovie, type TmdbShow } from "./tmdb";
import { getScores } from "./scores";
import { getCachedWatchProviders } from "./availability";
import { db } from "./db";
import { dismissedItems, watched } from "./schema";
import { eq } from "drizzle-orm";
import { ACCESSIBLE_PROVIDER_TYPES } from "./platforms";
import { YEAR_PREFIX_LENGTH } from "./config/feed";
import { BINGEABLE_MIN_VOTES } from "./collections";

export interface FeedItem {
  tmdbId: number;
  tmdbType: "movie" | "tv";
  title: string;
  year: string;
  posterUrl: string | null;
  overview: string;
  originalLanguage: string;
  platforms: string[];
  platformIds: number[];
  audienceScore: number | null;
  criticsScore: number | null;
  cinemaScore: number | null;
  voteCount: number | null;
  ribbon: string | null;
  scoreTooltip: string[];
  whyYoullLikeThis: string;
  rank: number;
}

// A discover/search result tagged with which TMDB namespace it came from, so a
// single enrichment path can handle movies and shows together. `media_type` is a
// per-variant discriminant (not a shared union) so `r.media_type === "movie"`
// narrows `r` to TmdbMovie — exposing `.title`/`.release_date` vs `.name`/`.first_air_date`.
export type DiscoverResult =
  | (TmdbMovie & { media_type: "movie" })
  | (TmdbShow & { media_type: "tv" });

function titleOf(r: DiscoverResult): string {
  return r.media_type === "movie" ? r.title : r.name;
}

function releaseDateOf(r: DiscoverResult): string {
  return (r.media_type === "movie" ? r.release_date : r.first_air_date) ?? "";
}

// Shared pipeline: take raw discover/search results, keep only those streaming
// on one of the user's platforms, attach scores, and shape into FeedItems.
// Used by the search and browse endpoints. Caller is responsible for slicing
// the input to a sane size before calling (each item costs a providers lookup).
// Pass userId to filter out items the user has dismissed or marked as watched.
//
// Note: buildFeed (recommendation-engine.ts) has its own inline enrichment path
// that works on TmdbMovie[] only and is optimised for the personalised feed.
// The two paths diverge intentionally — enrichToFeedItems handles mixed
// DiscoverResult[] (movie + TV) for browse/search; buildFeed handles the
// movie-only ranked feed pipeline. Do not merge them.
export async function enrichToFeedItems(
  results: DiscoverResult[],
  userPlatformTmdbIds: number[],
  region: string,
  userId?: string
): Promise<FeedItem[]> {
  let excludedIds: Set<number> | null = null;
  if (userId) {
    const [dismissedRows, watchedRows] = await Promise.all([
      db.select({ tmdbId: dismissedItems.tmdbId }).from(dismissedItems).where(eq(dismissedItems.userId, userId)),
      db.select({ tmdbId: watched.tmdbId }).from(watched).where(eq(watched.userId, userId)),
    ]);
    excludedIds = new Set([...dismissedRows.map((r) => r.tmdbId), ...watchedRows.map((r) => r.tmdbId)]);
  }
  const candidates = excludedIds ? results.filter((r) => !excludedIds.has(r.id)) : results;
  const withProviders = await Promise.all(
    candidates.map(async (r) => {
      const title = titleOf(r);
      const dateStr = releaseDateOf(r);
      try {
        const providers = await getCachedWatchProviders(r.id, r.media_type, region, {
          title,
          releaseYear: dateStr ? Number(dateStr.slice(0, YEAR_PREFIX_LENGTH)) || null : null,
          posterPath: r.poster_path,
        });
        const byId = new Map<number, string>();
        for (const type of ACCESSIBLE_PROVIDER_TYPES) {
          for (const p of providers[type] ?? []) {
            if (userPlatformTmdbIds.includes(p.provider_id)) byId.set(p.provider_id, p.provider_name);
          }
        }
        return { r, title, dateStr, platforms: [...byId.values()], platformIds: [...byId.keys()] };
      } catch {
        return { r, title, dateStr, platforms: [] as string[], platformIds: [] as number[] };
      }
    })
  );

  const onPlatforms = withProviders.filter((c) => c.platforms.length > 0);
  const items: FeedItem[] = [];
  for (const { r, title, dateStr, platforms, platformIds } of onPlatforms) {
    const year = dateStr.slice(0, YEAR_PREFIX_LENGTH);
    const scores = await getScores(
      r.id, r.media_type, title, year, r.vote_average, r.vote_count, r.popularity, dateStr || null
    );
    items.push({
      tmdbId: r.id,
      tmdbType: r.media_type,
      title,
      year,
      posterUrl: posterUrl(r.poster_path, "w342"),
      overview: r.overview ?? "",
      originalLanguage: r.original_language,
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
    // Bingeable ribbon: lowest priority — only when no other ribbon is set.
    // Uses vote_count as proxy (TMDB's number_of_seasons filter is silently ignored).
    const last = items[items.length - 1];
    if (last.tmdbType === "tv" && !last.ribbon && (last.voteCount ?? 0) >= Number(BINGEABLE_MIN_VOTES)) {
      last.ribbon = "bingeable";
    }
  }
  return items;
}
