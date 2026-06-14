import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ratings, watchlist, media, importHistory } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { parseLetterboxdRatings, parseLetterboxdWatchlist } from "@/lib/letterboxd-import";
import { RATING_SOURCE_USER } from "@/lib/config/ratings";

// Year tolerance for title+year matching (Letterboxd and TMDB can differ by 1)
const YEAR_TOLERANCE = 1;

type MediaRow = { id: number; tmdbId: number; tmdbType: string; title: string; releaseYear: number | null };

/** Build a lookup map from normalised title → media rows for fast in-memory matching. */
function buildTitleMap(allMedia: MediaRow[]): Map<string, MediaRow[]> {
  const map = new Map<string, MediaRow[]>();
  for (const m of allMedia) {
    const key = m.title.toLowerCase().trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return map;
}

function findMediaMatch(titleMap: Map<string, MediaRow[]>, title: string, year: number | null): MediaRow | null {
  const candidates = titleMap.get(title.toLowerCase().trim()) ?? [];
  if (candidates.length === 0) return null;
  if (!year) return candidates[0];
  // Prefer exact year match, then allow ±YEAR_TOLERANCE
  return (
    candidates.find((m) => m.releaseYear === year) ??
    candidates.find((m) => m.releaseYear != null && Math.abs(m.releaseYear - year) <= YEAR_TOLERANCE) ??
    null
  );
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { ratingsCsv?: string; watchlistCsv?: string };
  if (!body.ratingsCsv && !body.watchlistCsv) {
    return Response.json({ error: "Provide at least one CSV (ratingsCsv or watchlistCsv)" }, { status: 400 });
  }

  // Load the full media catalog once — used for title+year matching
  const allMedia = await db
    .select({ id: media.id, tmdbId: media.tmdbId, tmdbType: media.tmdbType, title: media.title, releaseYear: media.releaseYear })
    .from(media);
  const titleMap = buildTitleMap(allMedia);

  let ratingsImported = 0;
  let ratingsSkipped = 0;
  let ratingsNotFound = 0;
  let watchlistImported = 0;
  let watchlistSkipped = 0;
  let watchlistNotFound = 0;

  if (body.ratingsCsv) {
    const { rows, skipped } = parseLetterboxdRatings(body.ratingsCsv);
    ratingsSkipped += skipped;

    const existingRatings = await db
      .select({ tmdbId: ratings.tmdbId })
      .from(ratings)
      .where(eq(ratings.userId, userId));
    const ratedIds = new Set(existingRatings.map((r) => r.tmdbId));

    for (const row of rows) {
      const match = findMediaMatch(titleMap, row.title, row.year);
      if (!match) { ratingsNotFound++; continue; }
      if (ratedIds.has(match.tmdbId)) { ratingsSkipped++; continue; }

      await db.insert(ratings).values({
        userId,
        tmdbId: match.tmdbId,
        tmdbType: match.tmdbType,
        title: match.title,
        rating: row.rating,
        watchStatus: "watched",
        source: RATING_SOURCE_USER,
      });
      ratedIds.add(match.tmdbId);
      ratingsImported++;
    }
  }

  if (body.watchlistCsv) {
    const { rows, skipped } = parseLetterboxdWatchlist(body.watchlistCsv);
    watchlistSkipped += skipped;

    const existingWatchlist = await db
      .select({ tmdbId: watchlist.tmdbId })
      .from(watchlist)
      .where(eq(watchlist.userId, userId));
    const watchlistedIds = new Set(existingWatchlist.map((w) => w.tmdbId));

    for (const row of rows) {
      const match = findMediaMatch(titleMap, row.title, row.year);
      if (!match) { watchlistNotFound++; continue; }
      if (watchlistedIds.has(match.tmdbId)) { watchlistSkipped++; continue; }

      await db.insert(watchlist).values({
        userId,
        tmdbId: match.tmdbId,
        tmdbType: match.tmdbType,
        title: match.title,
      });
      watchlistedIds.add(match.tmdbId);
      watchlistImported++;
    }
  }

  const rowsImported = ratingsImported + watchlistImported;
  if (rowsImported > 0) {
    await db.insert(importHistory).values({ userId, source: "letterboxd", rowsImported });
  }

  return Response.json({ ratingsImported, ratingsSkipped, ratingsNotFound, watchlistImported, watchlistSkipped, watchlistNotFound });
}
