import { getTrendingMovies, getMovieDetails } from "@/lib/tmdb";
import { SEED_MOVIES_LIMIT } from "@/lib/config/feed";

export async function GET() {
  try {
    const trending = await getTrendingMovies();
    const top = trending.results.slice(0, SEED_MOVIES_LIMIT);

    const withGenres = await Promise.all(
      top.map(async (m) => {
        try {
          const details = await getMovieDetails(m.id);
          return { ...m, genres: details.genres };
        } catch {
          return m;
        }
      })
    );

    return Response.json({ movies: withGenres });
  } catch {
    return Response.json({ movies: [] });
  }
}
