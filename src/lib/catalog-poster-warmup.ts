import { db } from "./db";
import { media } from "./schema";
import { eq, or, isNull } from "drizzle-orm";
import { fetchMovieDetails, fetchShowDetails } from "./tmdb";

const ENRICH_BATCH_SIZE = 20;

/**
 * Fetch TMDB data for every catalog row missing a poster or overview.
 * Called at the end of each admin catalog sync. Idempotent — skips rows
 * that already have both fields.
 *
 * Pass `limit` to process only N rows per call (safe for short function timeouts).
 * Returns `{ enriched, remaining }` so callers know whether more rows are left.
 */
export async function enrichCatalogData(limit?: number): Promise<{ enriched: number; remaining: number }> {
  const allRows = await db
    .select({ id: media.id, tmdbId: media.tmdbId, tmdbType: media.tmdbType })
    .from(media)
    .where(
      or(
        isNull(media.posterPath),
        isNull(media.overview),
        eq(media.overview, ""),
      ),
    );

  const rows = limit !== undefined ? allRows.slice(0, limit) : allRows;
  const remaining = Math.max(0, allRows.length - rows.length);
  let enriched = 0;

  for (let i = 0; i < rows.length; i += ENRICH_BATCH_SIZE) {
    const batch = rows.slice(i, i + ENRICH_BATCH_SIZE);
    const counts: number[] = await Promise.all(
      batch.map(async (row) => {
        try {
          const details =
            row.tmdbType === "movie"
              ? await fetchMovieDetails(row.tmdbId)
              : await fetchShowDetails(row.tmdbId);
          const patch: Partial<typeof media.$inferInsert> = {};
          if (details.poster_path) patch.posterPath = details.poster_path;
          if (details.overview) patch.overview = details.overview;
          if (!Object.keys(patch).length) return 0;
          await db.update(media).set(patch).where(eq(media.id, row.id));
          return 1;
        } catch {
          return 0;
        }
      }),
    );
    enriched += counts.reduce((a, b) => a + b, 0);
  }

  return { enriched, remaining };
}
