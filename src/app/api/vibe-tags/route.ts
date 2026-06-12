import { auth } from "@/auth";
import { db } from "@/lib/db";
import { vibeTags } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ tags: [] });

  const tags = await db.select().from(vibeTags).where(eq(vibeTags.userId, userId));
  return Response.json({ tags: tags.map((t) => t.tag) });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { tags } = await request.json() as { tags: string[] };
  if (!Array.isArray(tags)) return Response.json({ error: "tags must be array" }, { status: 400 });

  for (const tag of tags) {
    if (typeof tag !== "string" || !tag.trim()) continue;
    await db.insert(vibeTags).values({ userId, tag: tag.trim() }).onConflictDoNothing();
  }

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { tag } = await request.json() as { tag: string };
  const existing = await db.select().from(vibeTags).where(eq(vibeTags.userId, userId));
  const match = existing.find((t) => t.tag === tag);
  if (match) {
    await db.delete(vibeTags).where(eq(vibeTags.id, match.id));
  }
  return Response.json({ ok: true });
}
