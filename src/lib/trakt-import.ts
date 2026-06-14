import { RATING_MIN, RATING_MAX } from "./config/ratings";

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

export interface ParseResult<T> {
  rows: T[];
  skipped: number;
}

// Parse CSV respecting quoted fields (e.g. "The Good, the Bad and the Ugly")
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Escaped quote inside a quoted field
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsv(csv: string): { headers: string[]; rows: string[][] } {
  const lines = csv.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const rows = lines.slice(1).map((l) => parseCsvLine(l));
  return { headers, rows };
}

function col(headers: string[], row: string[], name: string): string {
  const idx = headers.indexOf(name);
  return idx >= 0 ? (row[idx] ?? "").trim() : "";
}

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
