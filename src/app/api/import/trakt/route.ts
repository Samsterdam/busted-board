import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ratings, watchlist, importHistory } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { parseTraktRatings, parseTraktWatchlist } from "@/lib/trakt-import";
import { RATING_SOURCE_USER } from "@/lib/config/ratings";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { ratingsCsv?: string; watchlistCsv?: string };

  if (!body.ratingsCsv && !body.watchlistCsv) {
    return Response.json({ error: "Provide at least one CSV (ratingsCsv or watchlistCsv)" }, { status: 400 });
  }

  let ratingsImported = 0;
  let ratingsSkipped = 0;
  let watchlistImported = 0;
  let watchlistSkipped = 0;

  // --- Ratings import ---
  if (body.ratingsCsv) {
    const parsed = parseTraktRatings(body.ratingsCsv);
    ratingsSkipped += parsed.skipped;

    if (parsed.rows.length > 0) {
      // Fetch all tmdbIds the user has already rated (one query)
      const existingRatings = await db
        .select({ tmdbId: ratings.tmdbId })
        .from(ratings)
        .where(eq(ratings.userId, userId));
      const ratedIds = new Set(existingRatings.map((r) => r.tmdbId));

      const newRatings = parsed.rows.filter((r) => !ratedIds.has(r.tmdbId));
      ratingsSkipped += parsed.rows.length - newRatings.length;

      if (newRatings.length > 0) {
        await db.insert(ratings).values(
          newRatings.map((r) => ({
            userId,
            tmdbId: r.tmdbId,
            tmdbType: r.tmdbType,
            title: r.title,
            rating: r.rating,
            watchStatus: "watched" as const,
            source: RATING_SOURCE_USER,
          }))
        );
        ratingsImported = newRatings.length;
      }
    }
  }

  // --- Watchlist import ---
  if (body.watchlistCsv) {
    const parsed = parseTraktWatchlist(body.watchlistCsv);
    watchlistSkipped += parsed.skipped;

    if (parsed.rows.length > 0) {
      // Fetch all tmdbIds already in watchlist (one query)
      const existingWatchlist = await db
        .select({ tmdbId: watchlist.tmdbId })
        .from(watchlist)
        .where(eq(watchlist.userId, userId));
      const watchlistedIds = new Set(existingWatchlist.map((w) => w.tmdbId));

      const newItems = parsed.rows.filter((r) => !watchlistedIds.has(r.tmdbId));
      watchlistSkipped += parsed.rows.length - newItems.length;

      if (newItems.length > 0) {
        await db.insert(watchlist).values(
          newItems.map((r) => ({
            userId,
            tmdbId: r.tmdbId,
            tmdbType: r.tmdbType,
            title: r.title,
          }))
        );
        watchlistImported = newItems.length;
      }
    }
  }

  const rowsImported = ratingsImported + watchlistImported;
  if (rowsImported > 0) {
    await db.insert(importHistory).values({ userId, source: "trakt", rowsImported });
  }

  return Response.json({ ratingsImported, ratingsSkipped, watchlistImported, watchlistSkipped });
}
