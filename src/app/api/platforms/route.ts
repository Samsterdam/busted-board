import { NextRequest } from "next/server";
import { getOrCreateUser, getUserIdFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPlatforms } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getPlatformBySlug, PLATFORM_REGISTRY } from "@/lib/platforms";

export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return Response.json({ error: "No session" }, { status: 401 });

  const selected = db.select().from(userPlatforms).where(eq(userPlatforms.userId, userId)).all();

  return Response.json({
    available: PLATFORM_REGISTRY,
    selected: selected.map((p) => ({ slug: p.platformSlug, name: p.platformName, type: p.platformType })),
  });
}

export async function POST(request: NextRequest) {
  const user = await getOrCreateUser();
  const { platforms } = await request.json() as { platforms: string[] };

  if (!Array.isArray(platforms)) {
    return Response.json({ error: "platforms must be an array" }, { status: 400 });
  }

  // Replace all platforms
  db.delete(userPlatforms).where(eq(userPlatforms.userId, user.id)).run();

  for (const slug of platforms) {
    const platform = getPlatformBySlug(slug);
    if (!platform) continue;
    db.insert(userPlatforms).values({
      userId: user.id,
      platformSlug: platform.slug,
      platformName: platform.name,
      platformType: platform.type,
    }).run();
  }

  return Response.json({ ok: true });
}
