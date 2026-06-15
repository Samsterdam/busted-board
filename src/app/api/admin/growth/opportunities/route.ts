import { auth } from "@/auth";
import { db } from "@/lib/db";
import { opportunities } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { env } from "@/lib/env";
import { GROWTH_MAX_OPPORTUNITIES_PER_RUN } from "@/lib/config/growth";
import type { OpportunityStatus } from "@/lib/config/growth";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) return false;
  if (env.ADMIN_EMAIL && session.user.email !== env.ADMIN_EMAIL) return false;
  return true;
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") ?? "pending") as OpportunityStatus;

  const rows = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.status, status))
    .orderBy(desc(opportunities.score))
    .limit(GROWTH_MAX_OPPORTUNITIES_PER_RUN);

  return Response.json(rows);
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, status, draftResponse } = (await request.json()) as {
    id: number;
    status?: OpportunityStatus;
    draftResponse?: string;
  };

  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  await db
    .update(opportunities)
    .set({
      ...(status ? { status } : {}),
      ...(draftResponse !== undefined ? { draftResponse } : {}),
    })
    .where(eq(opportunities.id, id));

  return Response.json({ ok: true });
}
