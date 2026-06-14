import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ratings } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import {
  RATING_MIN,
  RATING_MAX,
  NOTES_MAX_LENGTH,
  VALID_WATCH_STATUSES,
  type WatchStatus,
} from "@/lib/config/ratings";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const numericId = parseInt(id);
  if (isNaN(numericId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  await db.delete(ratings).where(and(eq(ratings.id, numericId), eq(ratings.userId, userId)));
  return Response.json({ ok: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const numericId = parseInt(id);
  if (isNaN(numericId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json() as {
    rating?: number;
    notes?: string;
    watchStatus?: WatchStatus;
  };

  if (body.rating !== undefined && (body.rating < RATING_MIN || body.rating > RATING_MAX)) {
    return Response.json({ error: `Rating must be ${RATING_MIN}–${RATING_MAX}` }, { status: 400 });
  }
  if (body.watchStatus !== undefined && !(VALID_WATCH_STATUSES as readonly string[]).includes(body.watchStatus)) {
    return Response.json({ error: "Invalid watchStatus" }, { status: 400 });
  }
  if (body.notes !== undefined && body.notes.length > NOTES_MAX_LENGTH) {
    return Response.json({ error: `Notes must be ${NOTES_MAX_LENGTH} characters or fewer` }, { status: 400 });
  }

  await db.update(ratings)
    .set({
      ...(body.rating      !== undefined && { rating:      body.rating }),
      ...(body.notes       !== undefined && { notes:       body.notes }),
      ...(body.watchStatus !== undefined && { watchStatus: body.watchStatus }),
      updatedAt: new Date(),
    })
    .where(and(eq(ratings.id, numericId), eq(ratings.userId, userId)));

  return Response.json({ ok: true });
}
