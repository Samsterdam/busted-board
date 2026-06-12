import { NextRequest } from "next/server";
import { getOrCreateUser, getUserIdFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { vibeTags } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return Response.json({ tags: [] });

  const tags = db.select().from(vibeTags).where(eq(vibeTags.userId, userId)).all();
  return Response.json({ tags: tags.map((t) => t.tag) });
}

export async function POST(request: NextRequest) {
  const user = await getOrCreateUser();
  const { tags } = await request.json() as { tags: string[] };

  if (!Array.isArray(tags)) return Response.json({ error: "tags must be array" }, { status: 400 });

  for (const tag of tags) {
    if (typeof tag !== "string" || !tag.trim()) continue;
    db.insert(vibeTags)
      .values({ userId: user.id, tag: tag.trim() })
      .onConflictDoNothing()
      .run();
  }

  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return Response.json({ error: "No session" }, { status: 401 });

  const { tag } = await request.json() as { tag: string };
  const tags = db.select().from(vibeTags).where(eq(vibeTags.userId, userId)).all();
  const match = tags.find((t) => t.tag === tag);
  if (match) {
    db.delete(vibeTags).where(eq(vibeTags.id, match.id)).run();
  }

  return Response.json({ ok: true });
}
