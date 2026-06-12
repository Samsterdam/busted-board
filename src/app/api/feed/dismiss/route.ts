import { NextRequest } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dismissedItems } from "@/lib/schema";

export async function POST(request: NextRequest) {
  const user = await getOrCreateUser();
  const { tmdbId, tmdbType } = await request.json() as {
    tmdbId: number;
    tmdbType: "movie" | "tv";
  };

  db.insert(dismissedItems)
    .values({ userId: user.id, tmdbId, tmdbType })
    .onConflictDoNothing()
    .run();

  return Response.json({ ok: true });
}
