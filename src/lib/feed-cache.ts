import { db } from "@/lib/db";
import { feedCache } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { FEED_CACHE_MAX_AGE_MS } from "@/lib/config/durations";
import type { FeedItem } from "@/lib/feed-enrichment";

// v2 multi-page envelope stored in feedCache.recommendations
interface CacheEnvelope {
  v: 2;
  pages: Record<string, FeedItem[]>;
}

function parseEnvelope(raw: string): CacheEnvelope {
  const parsed = JSON.parse(raw) as unknown;
  if (Array.isArray(parsed)) {
    // Legacy flat-array (v1) — treat as page 1
    return { v: 2, pages: { "1": parsed as FeedItem[] } };
  }
  return parsed as CacheEnvelope;
}

export async function invalidateFeedCache(userId: string) {
  await db.delete(feedCache).where(eq(feedCache.userId, userId));
}

/**
 * Read all cached pages for a user. Returns null if no row exists or the
 * cache is older than FEED_CACHE_MAX_AGE_MS.
 */
export async function readCachePages(
  userId: string
): Promise<{ pages: Record<string, FeedItem[]>; generatedAt: Date } | null> {
  const [row] = await db
    .select()
    .from(feedCache)
    .where(eq(feedCache.userId, userId))
    .limit(1);

  if (!row) return null;

  const age = row.generatedAt ? Date.now() - row.generatedAt.getTime() : Infinity;
  if (age >= FEED_CACHE_MAX_AGE_MS) return null;

  const envelope = parseEnvelope(row.recommendations);
  return { pages: envelope.pages, generatedAt: row.generatedAt ?? new Date(0) };
}

/**
 * Write a single page into the cache for a user.
 *
 * - Empty pages are never written (hasMore=false is handled client-side).
 * - Writing page 1 always discards any previously cached pages 2+.
 * - Uses upsert so a concurrent invalidateFeedCache doesn't break the write.
 */
export async function writeCachePage(
  userId: string,
  page: number,
  items: FeedItem[],
  currentPages: Record<string, FeedItem[]>
): Promise<void> {
  if (items.length === 0) return;

  const pages: Record<string, FeedItem[]> =
    page === 1
      ? { "1": items }                              // discard stale pages 2+
      : { ...currentPages, [String(page)]: items }; // merge into existing

  const envelope: CacheEnvelope = { v: 2, pages };
  const recommendations = JSON.stringify(envelope);

  await db
    .insert(feedCache)
    .values({ userId, recommendations, generatedAt: new Date() })
    .onConflictDoUpdate({
      target: feedCache.userId,
      set: { recommendations, generatedAt: new Date() },
    });
}
