import { auth } from "@/auth";
import { db } from "@/lib/db";
import { dismissedItems } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { invalidateFeedCache } from "@/lib/feed-cache";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { tmdbId, tmdbType, title, posterPath, secondChance } = (await request.json()) as {
    tmdbId: number;
    tmdbType: "movie" | "tv";
    title?: string;
    posterPath?: string | null;
    secondChance?: boolean;
  };

  await db
    .insert(dismissedItems)
    .values({
      userId,
      tmdbId,
      tmdbType,
      title: title ?? null,
      posterPath: posterPath ?? null,
      secondChance: secondChance ?? false,
    })
    .onConflictDoUpdate({
      target: [dismissedItems.userId, dismissedItems.tmdbId, dismissedItems.tmdbType],
      set: { secondChance: secondChance ?? false },
    });
  await invalidateFeedCache(userId);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { tmdbId, tmdbType } = (await request.json()) as {
    tmdbId: number;
    tmdbType: "movie" | "tv";
  };

  await db
    .delete(dismissedItems)
    .where(
      and(
        eq(dismissedItems.userId, userId),
        eq(dismissedItems.tmdbId, tmdbId),
        eq(dismissedItems.tmdbType, tmdbType)
      )
    );
  // Un-dismissing makes the title eligible for the feed again.
  await invalidateFeedCache(userId);
  return Response.json({ ok: true });
}
