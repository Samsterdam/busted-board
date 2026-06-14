import { auth } from "@/auth";
import { db } from "@/lib/db";
import { watched, watchlist } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { invalidateFeedCache } from "@/lib/feed-cache";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const items = await db
    .select()
    .from(watched)
    .where(eq(watched.userId, userId))
    .orderBy(desc(watched.seenAt));
  return Response.json({ watched: items });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    tmdbId: number;
    tmdbType: "movie" | "tv";
    title: string;
    posterPath?: string | null;
  };

  if (!body.tmdbId || !body.tmdbType || !body.title) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(watched)
    .where(
      and(
        eq(watched.userId, userId),
        eq(watched.tmdbId, body.tmdbId),
        eq(watched.tmdbType, body.tmdbType)
      )
    )
    .limit(1);

  if (!existing) {
    await db.insert(watched).values({
      userId,
      tmdbId: body.tmdbId,
      tmdbType: body.tmdbType,
      title: body.title,
      posterPath: body.posterPath ?? null,
    });
  }

  // Seen ⇒ no longer "want to watch".
  await db
    .delete(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.tmdbId, body.tmdbId)));

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
    .delete(watched)
    .where(
      and(
        eq(watched.userId, userId),
        eq(watched.tmdbId, tmdbId),
        eq(watched.tmdbType, tmdbType)
      )
    );
  return Response.json({ ok: true });
}
