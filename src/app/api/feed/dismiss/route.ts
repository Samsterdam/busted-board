import { auth } from "@/auth";
import { db } from "@/lib/db";
import { dismissedItems } from "@/lib/schema";
import { invalidateFeedCache } from "@/lib/feed-cache";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { tmdbId, tmdbType } = await request.json() as { tmdbId: number; tmdbType: "movie" | "tv" };
  await db.insert(dismissedItems).values({ userId, tmdbId, tmdbType }).onConflictDoNothing();
  await invalidateFeedCache(userId);
  return Response.json({ ok: true });
}
