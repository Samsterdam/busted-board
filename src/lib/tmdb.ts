const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const API_KEY = process.env.TMDB_API_KEY!;

const TIMEOUT_MS = 10_000;

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`);
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

export function posterUrl(path: string | null | undefined, size: "w342" | "w500" | "original" = "w342"): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export interface TmdbMovie {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  overview: string;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  original_language: string;
  spoken_languages?: { iso_639_1: string; name: string }[];
}

export interface TmdbShow {
  id: number;
  name: string;
  first_air_date: string;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  overview: string;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  original_language: string;
  number_of_seasons?: number;
  status?: string;
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface WatchProviders {
  flatrate?: WatchProvider[];
  free?: WatchProvider[];
  ads?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
}

export async function getMovieDetails(tmdbId: number) {
  return tmdbFetch<TmdbMovie>(`/movie/${tmdbId}`);
}

export async function getShowDetails(tmdbId: number) {
  return tmdbFetch<TmdbShow>(`/tv/${tmdbId}`);
}

export async function getWatchProviders(tmdbId: number, type: "movie" | "tv", region: string): Promise<WatchProviders> {
  const data = await tmdbFetch<{ results: Record<string, WatchProviders> }>(
    `/${type}/${tmdbId}/watch/providers`
  );
  return data.results?.[region] ?? {};
}

export async function searchMulti(query: string) {
  return tmdbFetch<{ results: Array<(TmdbMovie | TmdbShow) & { media_type: "movie" | "tv" }> }>(
    "/search/multi",
    { query, language: "en-US", page: "1" }
  );
}

export async function discoverMovies(params: Record<string, string>) {
  return tmdbFetch<{ results: TmdbMovie[]; total_pages: number }>(
    "/discover/movie",
    { language: "en-US", ...params }
  );
}

export async function discoverShows(params: Record<string, string>) {
  return tmdbFetch<{ results: TmdbShow[]; total_pages: number }>(
    "/discover/tv",
    { language: "en-US", ...params }
  );
}

export async function getTrendingMovies() {
  return tmdbFetch<{ results: TmdbMovie[] }>("/trending/movie/week");
}

export async function getTrendingShows() {
  return tmdbFetch<{ results: TmdbShow[] }>("/trending/tv/week");
}

export async function getAvailableProviders(region: string) {
  return tmdbFetch<{ results: Array<{ provider_id: number; provider_name: string; logo_path: string }> }>(
    "/watch/providers/movie",
    { region }
  );
}

export async function getMovieCredits(tmdbId: number) {
  return tmdbFetch<{
    crew: Array<{ name: string; job: string }>;
    cast: Array<{ name: string; order: number }>;
  }>(`/movie/${tmdbId}/credits`);
}
