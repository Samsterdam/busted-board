"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { StarRating } from "@/components/ratings/StarRating";
import { posterUrl } from "@/lib/tmdb";

interface SeedMovie {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  genres?: { name: string }[];
}

export function InitialRatings() {
  const [movies, setMovies] = useState<SeedMovie[]>([]);
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tmdb/seed-movies")
      .then((r) => r.json())
      .then((data) => setMovies(data.movies ?? []))
      .catch(() => setMovies([]))
      .finally(() => setLoading(false));
  }, []);

  async function saveRating(tmdbId: number, rating: number, title: string, posterPath: string | null, year: string) {
    const newRatings = { ...ratings, [tmdbId]: rating };
    setRatings(newRatings);

    await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId, tmdbType: "movie", title, posterPath, rating, year }),
    }).catch(() => null);
  }

  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-1">Rate a few movies</h2>
        <p className="text-sm text-muted-foreground mb-5">This helps us understand your taste.</p>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Rate a few movies</h2>
      <p className="text-sm text-muted-foreground mb-5">
        This helps us understand your taste. Skip any you haven&rsquo;t seen.
      </p>
      <div className="space-y-3">
        {movies.map((movie) => {
          const year = (movie.release_date ?? "").slice(0, 4);
          const genres = movie.genres?.map((g) => g.name).join(", ") ?? "";
          const imgSrc = posterUrl(movie.poster_path, "w342");

          return (
            <div
              key={movie.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-secondary p-3"
            >
              {imgSrc ? (
                <Image
                  src={imgSrc}
                  alt={`Movie poster for ${movie.title}`}
                  width={40}
                  height={60}
                  className="rounded-lg object-cover flex-shrink-0"
                  unoptimized
                />
              ) : (
                <div className="h-[60px] w-10 rounded-lg bg-muted flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{movie.title}</p>
                <p className="text-xs text-muted-foreground truncate">{year}{genres ? ` · ${genres}` : ""}</p>
              </div>
              <StarRating
                value={ratings[movie.id] ?? 0}
                onChange={(r) => saveRating(movie.id, r, movie.title, movie.poster_path, year)}
                size="sm"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
