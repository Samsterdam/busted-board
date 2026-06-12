import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ country: "US", preferCaptions: false });

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return Response.json({
    country: user?.country ?? "US",
    preferCaptions: !!(user?.preferCaptions),
    contentLanguage: user?.contentLanguage ?? "any",
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
  };

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  await db.update(users).set({
    country: body.country ?? user.country,
    preferCaptions: body.preferCaptions ?? user.preferCaptions,
    contentLanguage: body.contentLanguage ?? user.contentLanguage,
  }).where(eq(users.id, userId));

  return Response.json({ ok: true });
}
