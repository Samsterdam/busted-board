/**
 * One-time backfill: fill in title + posterPath for legacy `dismissed_items`
 * rows that were saved without them (older dismiss paths didn't pass a title,
 * so they were invisible in the Not Interested tab).
 *
 * Looks each title-less row up on TMDB by (tmdbId, tmdbType) and writes back
 * the title and a full poster URL — matching the format current dismiss paths
 * store (the feed saves `item.posterUrl`, a full URL, not a raw path).
 *
 * Run:  npx tsx scripts/backfill-dismissed-titles.ts
 * Idempotent: only touches rows where title IS NULL.
 */
import { db } from "../src/lib/db";
import { dismissedItems } from "../src/lib/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getMovieDetails, getShowDetails, posterUrl } from "../src/lib/tmdb";

async function main() {
  const rows = await db
    .select()
    .from(dismissedItems)
    .where(isNull(dismissedItems.title));

  console.log(`Found ${rows.length} title-less dismissal(s) to backfill.`);
  if (rows.length === 0) return;

  let filled = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const details =
        row.tmdbType === "tv"
          ? await getShowDetails(row.tmdbId)
          : await getMovieDetails(row.tmdbId);

      const title = row.tmdbType === "tv"
        ? (details as { name: string }).name
        : (details as { title: string }).title;
      const poster = posterUrl(details.poster_path);

      await db
        .update(dismissedItems)
        .set({ title: title ?? null, posterPath: poster })
        .where(
          and(
            eq(dismissedItems.userId, row.userId),
            eq(dismissedItems.tmdbId, row.tmdbId),
            eq(dismissedItems.tmdbType, row.tmdbType)
          )
        );

      filled++;
      console.log(`  ✓ ${row.tmdbType} ${row.tmdbId} → ${title}`);
    } catch (err) {
      failed++;
      console.warn(`  ✗ ${row.tmdbType} ${row.tmdbId}: ${(err as Error).message}`);
    }
  }

  console.log(`\nDone. Filled ${filled}, failed ${failed}.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
