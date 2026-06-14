import { auth } from "@/auth";
import { db } from "@/lib/db";
import { catalogSyncLog } from "@/lib/schema";
import { gte, sum } from "drizzle-orm";
import { env } from "@/lib/env";
import { CATALOG_MOTN_MONTHLY_BUDGET } from "@/lib/config/catalog";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (env.ADMIN_EMAIL && session.user.email !== env.ADMIN_EMAIL) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [callsRow] = await db
    .select({ total: sum(catalogSyncLog.callsUsed) })
    .from(catalogSyncLog)
    .where(gte(catalogSyncLog.syncedAt, monthStart));

  const allRows = await db.select().from(catalogSyncLog);

  const lastSynced: Record<string, { syncedAt: string; itemCount: number }> = {};
  for (const row of allRows) {
    lastSynced[`${row.slug}:${row.mediaType}`] = {
      syncedAt: row.syncedAt.toISOString(),
      itemCount: row.itemCount,
    };
  }

  return Response.json({
    motnCallsThisMonth: Number(callsRow?.total ?? 0),
    motnMonthlyBudget: CATALOG_MOTN_MONTHLY_BUDGET,
    lastSynced,
  });
}
