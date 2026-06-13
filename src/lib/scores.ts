import { db } from "./db";
import { scoresCache } from "./schema";
import { eq, and } from "drizzle-orm";
import { env } from "./env";
import { SCORE_CACHE_TTL_MS, OMDB_TIMEOUT_MS } from "./config/durations";
import {
  AUDIENCE_SCORE_SCALE,
  CINEMA_SCORE_WEIGHT,
  CINEMA_SCORE_GREEN_MIN,
  CINEMA_SCORE_AMBER_MIN,
  RIBBON_TRENDING_MIN_POPULARITY,
  RIBBON_GEM_MIN_VOTE_AVG,
  RIBBON_GEM_MAX_POPULARITY,
  RIBBON_FAVORITE_MIN_VOTE_COUNT,
  RIBBON_NEW_WITHIN_MONTHS,
} from "./config/scoring";

const OMDB_BASE = "https://www.omdbapi.com";

export interface ScoreBreakdown {
  audienceScore: number | null;
  criticsScore: number | null;
  cinemaScore: number | null;
  voteCount: number | null;
  ribbon: string | null;
  tooltipLines: string[];
}

export function computeCinemaScore(audience: number | null, critics: number | null): number | null {
  const a = audience != null ? audience * AUDIENCE_SCORE_SCALE : null;
  const c = critics;
  if (a != null && c != null) return Math.round(a * CINEMA_SCORE_WEIGHT + c * CINEMA_SCORE_WEIGHT);
  if (a != null) return Math.round(a);
  if (c != null) return Math.round(c);
  return null;
}

export function computeRibbon(
  voteAvg: number | null,
  popularity: number | null,
  voteCount: number | null,
  releaseDate: string | null,
  awards: string | null
): string | null {
  if (awards && /won.{0,20}oscar/i.test(awards)) return "oscar";
  if (popularity != null && popularity > RIBBON_TRENDING_MIN_POPULARITY) return "trending";
  if (voteAvg != null && voteAvg >= RIBBON_GEM_MIN_VOTE_AVG && popularity != null && popularity < RIBBON_GEM_MAX_POPULARITY) return "gem";
  if (voteCount != null && voteCount > RIBBON_FAVORITE_MIN_VOTE_COUNT) return "favorite";
  if (releaseDate) {
    const released = new Date(releaseDate);
    const newCutoff = new Date();
    newCutoff.setMonth(newCutoff.getMonth() - RIBBON_NEW_WITHIN_MONTHS);
    if (released > newCutoff) return "new";
  }
  return null;
}

function buildTooltip(
  audience: number | null,
  critics: number | null,
  cinema: number | null,
  voteCount: number | null
): string[] {
  const lines: string[] = [];
  if (cinema != null) {
    lines.push(`Busted Board Cinema Score: ${cinema}`);
    lines.push("─────────────────────────");
  }
  // The "× 50%" labels are the human-readable form of CINEMA_SCORE_WEIGHT (0.5).
  if (critics != null) lines.push(`🍅 Critics (RT): ${critics}% × 50% = ${(critics * CINEMA_SCORE_WEIGHT).toFixed(1)}`);
  if (audience != null) {
    const norm = audience * AUDIENCE_SCORE_SCALE;
    lines.push(`⭐ Public (TMDB): ${audience} × 50% = ${(norm * CINEMA_SCORE_WEIGHT).toFixed(1)}`);
    if (voteCount) lines.push(`   (${voteCount.toLocaleString()} votes)`);
  }
  if (critics != null && audience != null && cinema != null) {
    lines.push("─────────────────────────");
    lines.push(`Total: ${cinema}`);
  }
  return lines;
}

async function fetchOmdbScores(title: string, year: string): Promise<{ critics: number | null; awards: string | null }> {
  const key = env.OMDB_API_KEY;
  if (!key) return { critics: null, awards: null };

  const url = new URL(OMDB_BASE);
  url.searchParams.set("t", title);
  url.searchParams.set("y", year);
  url.searchParams.set("apikey", key);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OMDB_TIMEOUT_MS);
    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return { critics: null, awards: null };

    const data = await res.json();
    if (data.Response === "False") return { critics: null, awards: null };

    const rtRating = data.Ratings?.find((r: { Source: string; Value: string }) => r.Source === "Rotten Tomatoes");
    const critics = rtRating ? parseInt(rtRating.Value) : null;
    return { critics: isNaN(critics!) ? null : critics, awards: data.Awards ?? null };
  } catch {
    return { critics: null, awards: null };
  }
}

export async function getScores(
  tmdbId: number,
  tmdbType: "movie" | "tv",
  title: string,
  year: string,
  voteAverage: number | null,
  voteCount: number | null,
  popularity: number | null,
  releaseDate: string | null
): Promise<ScoreBreakdown> {
  const [cached] = await db
    .select()
    .from(scoresCache)
    .where(and(eq(scoresCache.tmdbId, tmdbId), eq(scoresCache.tmdbType, tmdbType)))
    .limit(1);

  // fetchedAt is now a native Date from Postgres
  const isFresh = cached && (Date.now() - cached.fetchedAt!.getTime()) < SCORE_CACHE_TTL_MS;
  if (isFresh) {
    return {
      audienceScore: cached.audienceScore,
      criticsScore: cached.criticsScore,
      cinemaScore: cached.cinemaScore,
      voteCount: cached.voteCount,
      ribbon: cached.ribbon,
      tooltipLines: buildTooltip(cached.audienceScore, cached.criticsScore, cached.cinemaScore, cached.voteCount),
    };
  }

  const { critics, awards } = await fetchOmdbScores(title, year);
  const audience = voteAverage;
  const cinema = computeCinemaScore(audience, critics);
  const ribbon = computeRibbon(voteAverage, popularity, voteCount, releaseDate, awards);

  const cacheRow = { tmdbId, tmdbType, audienceScore: audience, criticsScore: critics, cinemaScore: cinema, ribbon, voteCount, fetchedAt: new Date() };

  if (cached) {
    await db.update(scoresCache).set(cacheRow).where(and(eq(scoresCache.tmdbId, tmdbId), eq(scoresCache.tmdbType, tmdbType)));
  } else {
    await db.insert(scoresCache).values(cacheRow);
  }

  return {
    audienceScore: audience,
    criticsScore: critics,
    cinemaScore: cinema,
    voteCount,
    ribbon,
    tooltipLines: buildTooltip(audience, critics, cinema, voteCount),
  };
}

export function getCinemaScoreColor(score: number | null): string {
  if (score == null) return "text-neutral-400";
  if (score >= CINEMA_SCORE_GREEN_MIN) return "text-green-400";
  if (score >= CINEMA_SCORE_AMBER_MIN) return "text-amber-400";
  return "text-red-400";
}
