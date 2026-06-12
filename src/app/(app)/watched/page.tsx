import { PageShell } from "@/components/layout/PageShell";
import { WatchedTabs } from "@/components/watched/WatchedTabs";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratings, watchlist } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Watched — Busted Board" };

export default async function WatchedPage() {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const watched = db
    .select()
    .from(ratings)
    .where(eq(ratings.userId, userId))
    .orderBy(desc(ratings.createdAt))
    .all();

  const wantToWatch = db
    .select()
    .from(watchlist)
    .where(eq(watchlist.userId, userId))
    .orderBy(desc(watchlist.addedAt))
    .all();

  return (
    <PageShell className="px-4 py-4">
      <WatchedTabs watched={watched} watchlist={wantToWatch} />
    </PageShell>
  );
}
