import { auth } from "@/auth";
import { db } from "@/lib/db";
import { tasteProfile, userPlatforms, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { interpretSearchQuery } from "@/lib/gemini";
import { discoverMovies, searchMulti, posterUrl, getSimilarTitles, type TmdbMovie, type TmdbShow } from "@/lib/tmdb";
import { getCachedWatchProviders } from "@/lib/availability";
import { getScores } from "@/lib/scores";
import { PLATFORM_REGISTRY, ACCESSIBLE_PROVIDER_TYPES } from "@/lib/platforms";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { query } = await request.json() as { query: string };
  if (!query?.trim()) return Response.json({ error: "Query required" }, { status: 400 });

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const region = user?.country ?? "US";

  const [profile] = await db.select().from(tasteProfile).where(eq(tasteProfile.userId, userId)).limit(1);
  const parsedProfile = profile?.topThemes ? {
    top_themes: JSON.parse(profile.topThemes ?? "[]"),
    avoid_themes: JSON.parse(profile.avoidThemes ?? "[]"),
    fav_directors: JSON.parse(profile.favDirectors ?? "[]"),
    fav_actors: JSON.parse(profile.favActors ?? "[]"),
    tone_description: profile.toneDescription ?? "",
    recommendation_strategy: profile.recommendationStrategy ?? "",
  } : null;

  const platforms = await db.select().from(userPlatforms).where(eq(userPlatforms.userId, userId));
  const platformTmdbIds = platforms
    .map((p) => PLATFORM_REGISTRY.find((r) => r.slug === p.platformSlug)?.tmdbId)
    .filter((id): id is number => id != null);

  const interpretation = await interpretSearchQuery(query, parsedProfile);

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
    const genreIds = interpretation.genres.map((g) => genreMap[g]).filter(Boolean).join(",");
    const res = await discoverMovies({
      sort_by: interpretation.sort_by || "popularity.desc",
      "vote_average.gte": String(interpretation.min_vote_average || 6.0),
      ...(genreIds ? { with_genres: genreIds } : {}),
    });
    results = (res.results ?? []).map((r) => ({ ...r, media_type: "movie" as const }));
  }

  // Attach availability + scores to a list of raw TMDB hits. Shared by the main
  // results and the "more like this" set so both render identically.
  type RawHit = (TmdbMovie | TmdbShow) & { media_type: "movie" | "tv" };
  async function enrich(list: RawHit[]) {
    const withAvailability = await Promise.all(
      list.slice(0, 20).map(async (r) => {
        try {
          const title = ("title" in r ? r.title : r.name) ?? "";
          const dateStr = ("release_date" in r ? r.release_date : r.first_air_date) ?? "";
          const releaseYear = dateStr ? Number(dateStr.slice(0, 4)) || null : null;
          const providers = await getCachedWatchProviders(r.id, r.media_type, region, {
            title,
            releaseYear,
            posterPath: r.poster_path ?? null,
          });
          const available: string[] = [];
          for (const type of ACCESSIBLE_PROVIDER_TYPES) {
            for (const p of providers[type] ?? []) {
              if (platformTmdbIds.includes(p.provider_id)) available.push(p.provider_name);
            }
          }
          return { ...r, platforms: [...new Set(available)] };
        } catch {
          return { ...r, platforms: [] as string[] };
        }
      })
    );

    return Promise.all(
      withAvailability.slice(0, 8).map(async (r) => {
        const title = ("title" in r ? r.title : r.name) ?? "";
        const year = (("release_date" in r ? r.release_date : r.first_air_date) ?? "").slice(0, 4);
        const scores = await getScores(r.id, r.media_type, title, year, r.vote_average, r.vote_count, r.popularity, null);
        return {
          tmdbId: r.id, tmdbType: r.media_type, title, year,
          posterUrl: posterUrl(r.poster_path ?? null, "w342"),
          overview: r.overview ?? "",
          platforms: r.platforms,
          cinemaScore: scores.cinemaScore,
          audienceScore: scores.audienceScore,
          criticsScore: scores.criticsScore,
          ribbon: scores.ribbon,
        };
      })
    );
  }

  const enriched = await enrich(results);

  // "More like this": when the query resolved to a concrete title, pull TMDB
  // recommendations for the top hit and enrich them the same way. Skipped for
  // genre/vibe queries (no single anchor title) and on any TMDB error.
  let similar: Awaited<ReturnType<typeof enrich>> = [];
  const topHit = results[0];
  if (topHit && interpretation.search_term) {
    try {
      const recs = await getSimilarTitles(topHit.id, topHit.media_type);
      const excludeIds = new Set<number>([topHit.id, ...enriched.map((e) => e.tmdbId)]);
      const similarRaw = (recs.results ?? []).filter((r) => !excludeIds.has(r.id));
      similar = await enrich(similarRaw);
    } catch {
      similar = [];
    }
  }

  return Response.json({ results: enriched, similar, explanation: interpretation.explanation, query });
}
