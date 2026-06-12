import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userPlatforms } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getPlatformBySlug, PLATFORM_REGISTRY } from "@/lib/platforms";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const selected = await db.select().from(userPlatforms).where(eq(userPlatforms.userId, userId));

  return Response.json({
    available: PLATFORM_REGISTRY,
    selected: selected.map((p) => ({ slug: p.platformSlug, name: p.platformName, type: p.platformType })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { platforms } = await request.json() as { platforms: string[] };
  if (!Array.isArray(platforms)) return Response.json({ error: "platforms must be an array" }, { status: 400 });

  await db.delete(userPlatforms).where(eq(userPlatforms.userId, userId));

  for (const slug of platforms) {
    const platform = getPlatformBySlug(slug);
    if (!platform) continue;
    await db.insert(userPlatforms).values({
      userId,
      platformSlug: platform.slug,
      platformName: platform.name,
      platformType: platform.type,
    });
  }

  return Response.json({ ok: true });
}
