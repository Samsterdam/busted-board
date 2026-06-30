import { PageShell } from "@/components/layout/PageShell";
import { WatchedTabs } from "@/components/watched/WatchedTabs";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ratings, watchlist, watched as watchedTable, dismissedItems } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";
import { RATING_SOURCE_USER } from "@/lib/config/ratings";
import { mergeWatched } from "@/lib/watched/merge-watched";

export const dynamic = "force-dynamic";
export const metadata = { title: "Watched — Busted Board" };

export default async function WatchedPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const [ratedItems, wantToWatch, seenItems, dismissed] = await Promise.all([
    db.select().from(ratings).where(and(eq(ratings.userId, userId), eq(ratings.source, RATING_SOURCE_USER))).orderBy(desc(ratings.createdAt)),
    db.select().from(watchlist).where(eq(watchlist.userId, userId)).orderBy(desc(watchlist.addedAt)),
    db.select().from(watchedTable).where(eq(watchedTable.userId, userId)).orderBy(desc(watchedTable.seenAt)),
    // Show every dismissal, including legacy title-less rows (they render with
    // a fallback label) — otherwise they silently vanish from this tab.
    db.select().from(dismissedItems).where(eq(dismissedItems.userId, userId)).orderBy(desc(dismissedItems.dismissedAt)),
  ]);

  const watched = mergeWatched(ratedItems, seenItems);

  return (
    <PageShell className="px-4 py-4">
      <WatchedTabs watched={watched} watchlist={wantToWatch} dismissed={dismissed} />
    </PageShell>
  );
}
