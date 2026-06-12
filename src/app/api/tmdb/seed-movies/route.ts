import { getTrendingMovies, getMovieDetails } from "@/lib/tmdb";

export async function GET() {
  try {
    const trending = await getTrendingMovies();
    const top = trending.results.slice(0, 8);

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
