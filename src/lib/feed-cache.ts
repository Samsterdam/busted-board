import { db } from "@/lib/db";
import { feedCache } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function invalidateFeedCache(userId: string) {
  await db.delete(feedCache).where(eq(feedCache.userId, userId));
}
