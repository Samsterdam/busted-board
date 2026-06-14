/**
 * Parser for Letterboxd CSV data exports.
 *
 * Letterboxd does not include TMDB IDs in their exports. Matching is done
 * server-side by title + year against the existing media catalog.
 *
 * Export format:
 *   ratings.csv / watched.csv: Date, Name, Year, Letterboxd URI, Rating[, Rewatch]
 *   watchlist.csv:             Date, Name, Year, Letterboxd URI
 */

import { RATING_MIN, RATING_MAX } from "./config/ratings";
import { parseCsv, col, type ParseResult } from "./csv-parser";

export type { ParseResult };

// Letterboxd uses 0.5–5.0 half-star ratings; we use integers 1–5.
const LB_RATING_MAX = RATING_MAX;

export interface LetterboxdRatingRow {
  title: string;
  year: number | null;
  rating: number; // 1–5 after rounding
}

export interface LetterboxdWatchlistRow {
  title: string;
  year: number | null;
}

function scaleRating(raw: number): number {
  return Math.max(RATING_MIN, Math.min(LB_RATING_MAX, Math.round(raw)));
}

/** Parse a Letterboxd ratings.csv or watched.csv export. */
export function parseLetterboxdRatings(csv: string): ParseResult<LetterboxdRatingRow> {
  const { headers, rows } = parseCsv(csv);
  const result: LetterboxdRatingRow[] = [];
  let skipped = 0;

  for (const row of rows) {
    // Letterboxd uses "Name" for title; some exports use "Title"
    const title = col(headers, row, "name") || col(headers, row, "title");
    const rawYear = col(headers, row, "year");
    const rawRating = col(headers, row, "rating");

    if (!title) { skipped++; continue; }
    const rating = parseFloat(rawRating);
    if (!rawRating || isNaN(rating) || rating <= 0) { skipped++; continue; }

    result.push({
      title,
      year: rawYear ? parseInt(rawYear, 10) : null,
      rating: scaleRating(rating),
    });
  }

  return { rows: result, skipped };
}

/** Parse a Letterboxd watchlist.csv export. */
export function parseLetterboxdWatchlist(csv: string): ParseResult<LetterboxdWatchlistRow> {
  const { headers, rows } = parseCsv(csv);
  const result: LetterboxdWatchlistRow[] = [];
  let skipped = 0;

  for (const row of rows) {
    const title = col(headers, row, "name") || col(headers, row, "title");
    const rawYear = col(headers, row, "year");

    if (!title) { skipped++; continue; }

    result.push({
      title,
      year: rawYear ? parseInt(rawYear, 10) : null,
    });
  }

  return { rows: result, skipped };
}
