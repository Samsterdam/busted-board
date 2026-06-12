import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ratings } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.delete(ratings).where(and(eq(ratings.id, parseInt(id)), eq(ratings.userId, userId)));
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
  const body = await request.json() as {
    rating?: number;
    notes?: string;
    watchStatus?: "watched" | "watching" | "completed" | "dropped";
  };

  await db.update(ratings)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(ratings.id, parseInt(id)), eq(ratings.userId, userId)));

  return Response.json({ ok: true });
}
