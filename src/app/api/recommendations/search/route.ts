import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasteProfile, userPlatforms, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { interpretSearchQuery } from "@/lib/gemini";
import { discoverMovies, searchMulti, getWatchProviders, posterUrl } from "@/lib/tmdb";
import { getScores } from "@/lib/scores";
import { PLATFORM_REGISTRY, ACCESSIBLE_PROVIDER_TYPES } from "@/lib/platforms";

export async function POST(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return Response.json({ error: "No session" }, { status: 401 });

  const { query } = await request.json() as { query: string };
  if (!query?.trim()) return Response.json({ error: "Query required" }, { status: 400 });

  const user = db.select().from(users).where(eq(users.id, userId)).get();
  const region = user?.country ?? "US";

  // Get taste profile
  const profile = db.select().from(tasteProfile).where(eq(tasteProfile.userId, userId)).get();
  const parsedProfile = profile?.topThemes ? {
    top_themes: JSON.parse(profile.topThemes ?? "[]"),
    avoid_themes: JSON.parse(profile.avoidThemes ?? "[]"),
    fav_directors: JSON.parse(profile.favDirectors ?? "[]"),
    fav_actors: JSON.parse(profile.favActors ?? "[]"),
    tone_description: profile.toneDescription ?? "",
    recommendation_strategy: profile.recommendationStrategy ?? "",
  } : null;

  // Get user platforms
  const platforms = db.select().from(userPlatforms).where(eq(userPlatforms.userId, userId)).all();
  const platformTmdbIds = platforms
    .map((p) => PLATFORM_REGISTRY.find((r) => r.slug === p.platformSlug)?.tmdbId)
    .filter((id): id is number => id != null);

  // Interpret with Gemini
  const interpretation = await interpretSearchQuery(query, parsedProfile);

  // Search TMDB
  let results;
  if (interpretation.search_term) {
    const res = await searchMulti(interpretation.search_term);
    results = (res.results ?? []).filter((r) => r.media_type === "movie" || r.media_type === "tv");
  } else {
    const genreMap: Record<string, number> = {
      Action: 28, Adventure: 12, Animation: 16, Comedy: 35, Crime: 80,
      Documentary: 99, Drama: 18, Fantasy: 14, Horror: 27, Mystery: 9648,
      Romance: 10749, "Science Fiction": 878, Thriller: 53,
    };
    const genreIds = interpretation.genres
      .map((g) => genreMap[g])
      .filter(Boolean)
      .join(",");

    const res = await discoverMovies({
      sort_by: interpretation.sort_by || "popularity.desc",
      "vote_average.gte": String(interpretation.min_vote_average || 6.0),
      ...(genreIds ? { with_genres: genreIds } : {}),
    });
    results = (res.results ?? []).map((r) => ({ ...r, media_type: "movie" as const }));
  }

  // Check platform availability
  const withAvailability = await Promise.all(
    results.slice(0, 20).map(async (r) => {
      try {
        const providers = await getWatchProviders(r.id, r.media_type, region);
        const available: string[] = [];
        for (const type of ACCESSIBLE_PROVIDER_TYPES) {
          for (const p of providers[type] ?? []) {
            if (platformTmdbIds.includes(p.provider_id)) available.push(p.provider_name);
          }
        }
        return { ...r, platforms: [...new Set(available)] };
      } catch {
        return { ...r, platforms: [] };
      }
    })
  );

  // Build response with scores
  const enriched = await Promise.all(
    withAvailability.slice(0, 8).map(async (r) => {
      const title = ("title" in r ? r.title : r.name) ?? "";
      const year = (("release_date" in r ? r.release_date : r.first_air_date) ?? "").slice(0, 4);
      const posterPath = r.poster_path ?? null;
      const scores = await getScores(r.id, r.media_type, title, year, r.vote_average, r.vote_count, r.popularity, null);

      return {
        tmdbId: r.id,
        tmdbType: r.media_type,
        title,
        year,
        posterUrl: posterUrl(posterPath, "w342"),
        overview: r.overview ?? "",
        platforms: r.platforms,
        cinemaScore: scores.cinemaScore,
        audienceScore: scores.audienceScore,
        criticsScore: scores.criticsScore,
        ribbon: scores.ribbon,
      };
    })
  );

  return Response.json({
    results: enriched,
    explanation: interpretation.explanation,
    query,
  });
}
