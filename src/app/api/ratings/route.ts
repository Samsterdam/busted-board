import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ratings } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { RATING_MIN, RATING_MAX } from "@/lib/config/ratings";

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const rows = await db
    .select()
    .from(ratings)
    .where(eq(ratings.userId, userId))
    .orderBy(desc(ratings.createdAt))
    .limit(limit)
    .offset(offset);

  return Response.json({ ratings: rows, page });
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
    rating: number;
    notes?: string;
    watchStatus?: "watched" | "watching" | "completed" | "dropped";
  };

  if (!body.tmdbId || !body.tmdbType || !body.title || !body.rating) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (body.rating < RATING_MIN || body.rating > RATING_MAX) {
    return Response.json({ error: "Rating must be 1–5" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(ratings)
    .where(and(eq(ratings.userId, userId), eq(ratings.tmdbId, body.tmdbId)))
    .limit(1);

  if (existing) {
    await db.update(ratings).set({
      rating: body.rating,
      notes: body.notes ?? existing.notes,
      watchStatus: body.watchStatus ?? existing.watchStatus,
      updatedAt: new Date(),
    }).where(eq(ratings.id, existing.id));
    return Response.json({ id: existing.id, updated: true });
  }

  const [result] = await db.insert(ratings).values({
    userId,
    tmdbId: body.tmdbId,
    tmdbType: body.tmdbType,
    title: body.title,
    posterPath: body.posterPath ?? null,
    rating: body.rating,
    notes: body.notes ?? null,
    watchStatus: body.watchStatus ?? "watched",
  }).returning({ id: ratings.id });

  return Response.json({ id: result?.id, created: true });
}
