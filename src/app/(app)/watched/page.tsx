import { PageShell } from "@/components/layout/PageShell";
import { WatchedTabs } from "@/components/watched/WatchedTabs";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ratings, watchlist, watched as watchedTable, dismissedItems } from "@/lib/schema";
import { eq, desc, and, isNotNull } from "drizzle-orm";
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
    // Only dismissals captured with a title can render in the list; older,
    // title-less rows still filter the feed but have nothing to show here.
    db.select().from(dismissedItems).where(and(eq(dismissedItems.userId, userId), isNotNull(dismissedItems.title))).orderBy(desc(dismissedItems.dismissedAt)),
  ]);

  const watched = mergeWatched(ratedItems, seenItems);

  return (
    <PageShell className="px-4 py-4">
      <WatchedTabs watched={watched} watchlist={wantToWatch} dismissed={dismissed} />
    </PageShell>
  );
}
