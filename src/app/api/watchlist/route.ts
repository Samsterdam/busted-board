import { NextRequest } from "next/server";
import { getOrCreateUser, getUserIdFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { watchlist } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return Response.json({ watchlist: [] });

  const items = db
    .select()
    .from(watchlist)
    .where(eq(watchlist.userId, userId))
    .orderBy(desc(watchlist.addedAt))
    .all();

  return Response.json({ watchlist: items });
}

export async function POST(request: NextRequest) {
  const user = await getOrCreateUser();
  const body = await request.json() as {
    tmdbId: number;
    tmdbType: "movie" | "tv";
    title: string;
    posterPath?: string | null;
  };

  // Don't duplicate
  const existing = db
    .select()
    .from(watchlist)
    .where(and(eq(watchlist.userId, user.id), eq(watchlist.tmdbId, body.tmdbId)))
    .get();

  if (!existing) {
    db.insert(watchlist).values({
      userId: user.id,
      tmdbId: body.tmdbId,
      tmdbType: body.tmdbType,
      title: body.title,
      posterPath: body.posterPath ?? null,
    }).run();
  }

  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return Response.json({ error: "No session" }, { status: 401 });

  const { tmdbId } = await request.json() as { tmdbId: number };

  db.delete(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.tmdbId, tmdbId)))
    .run();

  return Response.json({ ok: true });
}
