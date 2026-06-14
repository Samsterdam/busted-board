import { RATING_MIN, RATING_MAX } from "./config/ratings";
import { parseCsv, col, type ParseResult } from "./csv-parser";

// Trakt uses a 1–10 rating scale; we use 1–5. Division factor for the conversion.
const TRAKT_RATING_SCALE = 2;
// Trakt ratings outside 1–10 are invalid per their export format.
const TRAKT_RATING_MAX = 10;

export interface TraktRatingRow {
  tmdbId: number;
  tmdbType: "movie" | "tv";
  title: string;
  year: number | null;
  rating: number;
}

export interface TraktWatchlistRow {
  tmdbId: number;
  tmdbType: "movie" | "tv";
  title: string;
  year: number | null;
}

export type { ParseResult };

// Trakt uses 1-10; our system uses 1-5.
function scaleTraktRating(traktRating: number): number {
  return Math.max(RATING_MIN, Math.min(RATING_MAX, Math.round(traktRating / TRAKT_RATING_SCALE)));
}

function mapType(raw: string): "movie" | "tv" | null {
  const t = raw.toLowerCase();
  if (t === "movie" || t === "movies") return "movie";
  if (t === "show" || t === "shows" || t === "tv") return "tv";
  return null;
}

// ratings.csv columns: Title, Year, Trakt Rating, Letterboxd Rating, Type, tmdbID, ...
export function parseTraktRatings(csv: string): ParseResult<TraktRatingRow> {
  const { headers, rows } = parseCsv(csv);
  const result: TraktRatingRow[] = [];
  let skipped = 0;

  for (const row of rows) {
    const rawId = col(headers, row, "tmdbid");
    const rawType = col(headers, row, "type");
    const rawRating = col(headers, row, "trakt_rating");
    const title = col(headers, row, "title");
    const rawYear = col(headers, row, "year");

    const tmdbId = parseInt(rawId, 10);
    const tmdbType = mapType(rawType);
    const traktRating = parseInt(rawRating, 10);

    if (!tmdbId || !tmdbType || !traktRating || traktRating < RATING_MIN || traktRating > TRAKT_RATING_MAX || !title) {
      skipped++;
      continue;
    }

    result.push({
      tmdbId,
      tmdbType,
      title,
      year: rawYear ? parseInt(rawYear, 10) : null,
      rating: scaleTraktRating(traktRating),
    });
  }

  return { rows: result, skipped };
}

// watchlist.csv columns: Title, Year, Type, tmdbID, ...
export function parseTraktWatchlist(csv: string): ParseResult<TraktWatchlistRow> {
  const { headers, rows } = parseCsv(csv);
  const result: TraktWatchlistRow[] = [];
  let skipped = 0;

  for (const row of rows) {
    const rawId = col(headers, row, "tmdbid");
    const rawType = col(headers, row, "type");
    const title = col(headers, row, "title");
    const rawYear = col(headers, row, "year");

    const tmdbId = parseInt(rawId, 10);
    const tmdbType = mapType(rawType);

    if (!tmdbId || !tmdbType || !title) {
      skipped++;
      continue;
    }

    result.push({
      tmdbId,
      tmdbType,
      title,
      year: rawYear ? parseInt(rawYear, 10) : null,
    });
  }

  return { rows: result, skipped };
}
