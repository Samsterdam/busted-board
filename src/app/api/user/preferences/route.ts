import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { invalidateFeedCache } from "@/lib/feed-cache";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ country: "US", preferCaptions: false });

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return Response.json({
    country: user?.country ?? "US",
    preferCaptions: !!(user?.preferCaptions),
    contentLanguage: user?.contentLanguage ?? "any",
    kidsMode: !!(user?.kidsMode),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    country?: string;
    preferCaptions?: boolean;
    contentLanguage?: string;
    kidsMode?: boolean;
  };

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const nextKidsMode = body.kidsMode ?? user.kidsMode;

  await db.update(users).set({
    country: body.country ?? user.country,
    preferCaptions: body.preferCaptions ?? user.preferCaptions,
    contentLanguage: body.contentLanguage ?? user.contentLanguage,
    kidsMode: nextKidsMode,
  }).where(eq(users.id, userId));

  // Kids Mode changes the entire candidate pool — drop the cached feed so the
  // next load rebuilds under the new mode (prevents adult content leaking into
  // a kids feed and vice-versa).
  if (nextKidsMode !== user.kidsMode) {
    await invalidateFeedCache(userId);
  }

  return Response.json({ ok: true });
}
