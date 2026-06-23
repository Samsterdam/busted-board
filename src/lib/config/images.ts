// TMDB image URL helpers. Dependency-free so client components can import it
// without pulling in the server-side tmdb.ts module (which holds API access).
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export type PosterSize = "w92" | "w154" | "w342" | "w500" | "original";

/**
 * Build a poster `src` from a stored `posterPath`. Tolerates both bare TMDB
 * paths ("/abc.jpg") and already-absolute URLs (some rows persist the full
 * URL), so it never double-prefixes. Returns null when there's nothing to show.
 */
export function posterSrc(
  posterPath: string | null | undefined,
  size: PosterSize = "w92"
): string | null {
  if (!posterPath) return null;
  if (posterPath.startsWith("http")) return posterPath;
  return `${TMDB_IMAGE_BASE}/${size}${posterPath}`;
}
