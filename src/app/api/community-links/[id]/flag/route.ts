import { auth } from "@/auth";
import { db } from "@/lib/db";
import { communityLinks, communityLinkFlags } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const linkId = parseInt(id);
  if (!linkId) return Response.json({ error: "Invalid link id" }, { status: 400 });

  // Verify the link exists
  const [link] = await db
    .select({ id: communityLinks.id, userId: communityLinks.userId })
    .from(communityLinks)
    .where(eq(communityLinks.id, linkId))
    .limit(1);

  if (!link) return Response.json({ error: "Link not found" }, { status: 404 });

  // Don't let users flag their own submissions
  if (link.userId === userId) {
    return Response.json({ error: "Cannot flag your own submission" }, { status: 400 });
  }

  // Insert flag — unique constraint prevents double-flagging by same user
  try {
    await db.insert(communityLinkFlags).values({ linkId, userId });
  } catch {
    // Already flagged by this user
    return Response.json({ error: "Already flagged" }, { status: 400 });
  }

  // Increment flagCount on the link
  await db
    .update(communityLinks)
    .set({ flagCount: sql`${communityLinks.flagCount} + 1` })
    .where(eq(communityLinks.id, linkId));

  return Response.json({ flagged: true });
}
