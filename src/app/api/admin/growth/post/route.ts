import { auth } from "@/auth";
import { db } from "@/lib/db";
import { opportunities } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { postComment } from "@/lib/growth/reddit";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) return false;
  if (env.ADMIN_EMAIL && session.user.email !== env.ADMIN_EMAIL) return false;
  return true;
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { opportunityId, text } = (await request.json()) as {
    opportunityId: number;
    text: string;
  };

  if (!opportunityId || !text?.trim()) {
    return Response.json({ error: "opportunityId and text required" }, { status: 400 });
  }

  const [opp] = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.id, opportunityId))
    .limit(1);

  if (!opp) return Response.json({ error: "Opportunity not found" }, { status: 404 });
  if (opp.status === "posted") {
    return Response.json({ error: "Already posted" }, { status: 409 });
  }

  if (opp.platform !== "reddit") {
    return Response.json({ error: "Only reddit posting is supported" }, { status: 400 });
  }

  const permalink = await postComment(opp.externalId, text);

  await db
    .update(opportunities)
    .set({ status: "posted", postedAt: new Date(), postedUrl: permalink, draftResponse: text })
    .where(eq(opportunities.id, opportunityId));

  return Response.json({ url: permalink });
}
