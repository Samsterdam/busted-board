import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratings } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return Response.json({ error: "No session" }, { status: 401 });

  const { id } = await params;
  const ratingId = parseInt(id);

  db.delete(ratings)
    .where(and(eq(ratings.id, ratingId), eq(ratings.userId, userId)))
    .run();

  return Response.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return Response.json({ error: "No session" }, { status: 401 });

  const { id } = await params;
  const ratingId = parseInt(id);
  const body = await request.json() as {
    rating?: number;
    notes?: string;
    watchStatus?: "watched" | "watching" | "completed" | "dropped";
  };

  db.update(ratings)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(ratings.id, ratingId), eq(ratings.userId, userId)))
    .run();

  return Response.json({ ok: true });
}
