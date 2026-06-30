import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { searchMulti, posterUrl, type TmdbMovie, type TmdbShow } from "@/lib/tmdb";
import { SEARCH_RESULT_LIMIT, YEAR_PREFIX_LENGTH } from "@/lib/config/feed";
import { TITLE_MAX_LENGTH } from "@/lib/config/ratings";
import { isKidSafeByGenre } from "@/lib/config/kids";

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const query = String(body.query ?? "").trim().slice(0, TITLE_MAX_LENGTH);
  if (!query) return Response.json({ results: [], similar: [], explanation: null });

  // /search/multi has no certification/genre filter, so kids mode is enforced as
  // a post-fetch genre overlap check (certification isn't returned on search).
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const kidsMode = !!user?.kidsMode;

  try {
    const { results } = await searchMulti(query);
    const items = (results ?? [])
      .filter((r) => r.media_type === "movie" || r.media_type === "tv")
      .filter((r) => !kidsMode || isKidSafeByGenre(r.genre_ids))
      .slice(0, SEARCH_RESULT_LIMIT)
      .map((r) => {
        const isMovie = r.media_type === "movie";
        const title = isMovie ? (r as TmdbMovie).title : (r as TmdbShow).name;
        const releaseDate = isMovie
          ? ((r as TmdbMovie).release_date ?? "")
          : ((r as TmdbShow).first_air_date ?? "");
        return {
          tmdbId: r.id,
          tmdbType: r.media_type as "movie" | "tv",
          title,
          year: releaseDate.slice(0, YEAR_PREFIX_LENGTH),
          posterUrl: posterUrl(r.poster_path),
          overview: r.overview,
          originalLanguage: r.original_language,
          voteCount: r.vote_count,
        };
      });

    return Response.json({
      results: items,
      similar: [],
      explanation: items.length > 0 ? `Results for "${query}"` : null,
    });
  } catch {
    return Response.json({ results: [], similar: [], explanation: null });
  }
}
