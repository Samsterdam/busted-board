import { db } from "./db";
import { media } from "./schema";
import { eq, isNull } from "drizzle-orm";
import { fetchMovieDetails, fetchShowDetails } from "./tmdb";

const WARMUP_BATCH_SIZE = 20;

/**
 * Fetch TMDB poster paths for every catalog media row that has none.
 * Called at the end of each admin catalog sync so feed cards always
 * have images. Idempotent — skips rows that already have a posterPath.
 * Returns the number of rows successfully updated.
 */
export async function warmupCatalogPosters(): Promise<number> {
  const rows = await db
    .select({ id: media.id, tmdbId: media.tmdbId, tmdbType: media.tmdbType })
    .from(media)
    .where(isNull(media.posterPath));

  let updated = 0;

  for (let i = 0; i < rows.length; i += WARMUP_BATCH_SIZE) {
    const batch = rows.slice(i, i + WARMUP_BATCH_SIZE);
    const counts: number[] = await Promise.all(
      batch.map(async (row) => {
        try {
          const details = row.tmdbType === "movie"
            ? await fetchMovieDetails(row.tmdbId)
            : await fetchShowDetails(row.tmdbId);
          if (!details.poster_path) return 0;
          await db.update(media)
            .set({ posterPath: details.poster_path })
            .where(eq(media.id, row.id));
          return 1;
        } catch {
          return 0;
        }
      })
    );
    updated += counts.reduce((a, b) => a + b, 0);
  }

  return updated;
}
