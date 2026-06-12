import { db } from "./db";
import { scoresCache } from "./schema";
import { eq, and } from "drizzle-orm";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const OMDB_BASE = "https://www.omdbapi.com";
const TIMEOUT_MS = 8_000;

export interface ScoreBreakdown {
  audienceScore: number | null;
  criticsScore: number | null;
  cinemaScore: number | null;
  voteCount: number | null;
  ribbon: string | null;
  tooltipLines: string[];
}

function computeCinemaScore(audience: number | null, critics: number | null): number | null {
  const a = audience != null ? audience * 10 : null;
  const c = critics;
  if (a != null && c != null) return Math.round(a * 0.5 + c * 0.5);
  if (a != null) return Math.round(a);
  if (c != null) return Math.round(c);
  return null;
}

function computeRibbon(
  voteAvg: number | null,
  popularity: number | null,
  voteCount: number | null,
  releaseDate: string | null,
  awards: string | null
): string | null {
  if (awards && /won.{0,20}oscar/i.test(awards)) return "oscar";
  if (popularity != null && popularity > 100) return "trending";
  if (voteAvg != null && voteAvg >= 7.5 && popularity != null && popularity < 20) return "gem";
  if (voteCount != null && voteCount > 10_000) return "favorite";
  if (releaseDate) {
    const released = new Date(releaseDate);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    if (released > sixMonthsAgo) return "new";
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
  if (critics != null) lines.push(`🍅 Critics (RT): ${critics}% × 50% = ${(critics * 0.5).toFixed(1)}`);
  if (audience != null) {
    const norm = audience * 10;
    lines.push(`⭐ Public (TMDB): ${audience} × 50% = ${(norm * 0.5).toFixed(1)}`);
    if (voteCount) lines.push(`   (${voteCount.toLocaleString()} votes)`);
  }
  if (critics != null && audience != null && cinema != null) {
    lines.push("─────────────────────────");
    lines.push(`Total: ${cinema}`);
  }
  return lines;
}

async function fetchOmdbScores(title: string, year: string): Promise<{ critics: number | null; awards: string | null }> {
  const key = process.env.OMDB_API_KEY;
  if (!key) return { critics: null, awards: null };

  const url = new URL(OMDB_BASE);
  url.searchParams.set("t", title);
  url.searchParams.set("y", year);
  url.searchParams.set("apikey", key);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
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
  const isFresh = cached && (Date.now() - cached.fetchedAt!.getTime()) < CACHE_TTL_MS;
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
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}
