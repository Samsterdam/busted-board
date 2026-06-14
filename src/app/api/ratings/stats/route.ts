import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ratings } from "@/lib/schema";
import { eq, count, and } from "drizzle-orm";
import { RATING_MIN, RATING_MAX, RATING_SOURCE_USER } from "@/lib/config/ratings";

type Distribution = Record<number, number>;

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({ rating: ratings.rating, count: count() })
    .from(ratings)
    .where(and(eq(ratings.userId, userId), eq(ratings.source, RATING_SOURCE_USER)))
    .groupBy(ratings.rating);

  const distribution: Distribution = {};
  for (let s = RATING_MIN; s <= RATING_MAX; s++) distribution[s] = 0;
  for (const row of rows) distribution[row.rating] = row.count;

  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return Response.json({ distribution, total });
}
