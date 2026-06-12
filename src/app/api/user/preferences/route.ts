import { NextRequest } from "next/server";
import { getOrCreateUser, getUserIdFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return Response.json({ country: "US", preferCaptions: false });

  const user = db.select().from(users).where(eq(users.id, userId)).get();
  return Response.json({
    country: user?.country ?? "US",
    preferCaptions: !!(user?.preferCaptions),
    contentLanguage: user?.contentLanguage ?? "any",
  });
}

export async function POST(request: NextRequest) {
  const user = await getOrCreateUser();
  const body = await request.json() as {
    country?: string;
    preferCaptions?: boolean;
    contentLanguage?: string;
  };

  db.update(users).set({
    country: body.country ?? user.country,
    preferCaptions: body.preferCaptions ? 1 : 0,
    contentLanguage: body.contentLanguage ?? user.contentLanguage,
  }).where(eq(users.id, user.id)).run();

  return Response.json({ ok: true });
}
