import { auth } from "@/auth";
import { db } from "@/lib/db";
import { watchlist } from "@/lib/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { getSubscriptionStatus } from "@/lib/stripe-server";
import { WATCHLIST_FREE_LIMIT } from "@/lib/config/stripe";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ watchlist: [] });

  const items = await db.select().from(watchlist).where(eq(watchlist.userId, userId)).orderBy(desc(watchlist.addedAt));
  return Response.json({ watchlist: items });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    tmdbId: number;
    tmdbType: "movie" | "tv";
    title: string;
    posterPath?: string | null;
  };

  // Freemium gate: check item count before the duplicate check so the count
  // reflects what will actually be inserted (not inflated by the item itself).
  const [existing] = await db
    .select()
    .from(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.tmdbId, body.tmdbId)))
    .limit(1);

  if (!existing) {
    const sub = await getSubscriptionStatus(userId);
    const isPaid = sub?.status === "active";
    if (!isPaid) {
      const [{ value: itemCount }] = await db
        .select({ value: count() })
        .from(watchlist)
        .where(eq(watchlist.userId, userId));
      if (itemCount >= WATCHLIST_FREE_LIMIT) {
        return Response.json(
          { error: `Free accounts can save up to ${WATCHLIST_FREE_LIMIT} titles. Upgrade to save more.` },
          { status: 402 }
        );
      }
    }
  }

  if (!existing) {
    await db.insert(watchlist).values({
      userId,
      tmdbId: body.tmdbId,
      tmdbType: body.tmdbType,
      title: body.title,
      posterPath: body.posterPath ?? null,
    });
  }

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { tmdbId } = await request.json() as { tmdbId: number };
  await db.delete(watchlist).where(and(eq(watchlist.userId, userId), eq(watchlist.tmdbId, tmdbId)));
  return Response.json({ ok: true });
}
