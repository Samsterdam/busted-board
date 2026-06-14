import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { searchMulti, posterUrl, type TmdbMovie, type TmdbShow } from "@/lib/tmdb";
import { SEARCH_RESULT_LIMIT, YEAR_PREFIX_LENGTH } from "@/lib/config/feed";
import { TITLE_MAX_LENGTH } from "@/lib/config/ratings";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const query = String(body.query ?? "").trim().slice(0, TITLE_MAX_LENGTH);
  if (!query) return Response.json({ results: [], similar: [], explanation: null });

  try {
    const { results } = await searchMulti(query);
    const items = (results ?? [])
      .filter((r) => r.media_type === "movie" || r.media_type === "tv")
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
