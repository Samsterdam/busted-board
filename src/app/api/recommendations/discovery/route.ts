import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userPlatforms, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { buildDiscoveryItems } from "@/lib/discovery-engine";
import { PLATFORM_REGISTRY } from "@/lib/platforms";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const platforms = await db.select().from(userPlatforms).where(eq(userPlatforms.userId, userId));
  const platformTmdbIds = platforms
    .map((p) => PLATFORM_REGISTRY.find((r) => r.slug === p.platformSlug)?.tmdbId)
    .filter((id): id is number => id != null);

  if (platformTmdbIds.length === 0) {
    return Response.json({ discovery: [] });
  }

  const discovery = await buildDiscoveryItems(userId, platformTmdbIds, user?.country ?? "US");
  return Response.json({ discovery });
}
