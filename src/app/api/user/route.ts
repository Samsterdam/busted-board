import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  users,
  ratings,
  watchlist,
  watched,
  dismissedItems,
  tasteProfile,
  vibeTags,
  userPlatforms,
  feedCache,
  importHistory,
  communityLinks,
  communityLinkFlags,
} from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function DELETE() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Delete child rows first — only `accounts` has onDelete: cascade from `users`;
  // all other tables must be cleared explicitly before deleting the user row.
  await db.delete(importHistory).where(eq(importHistory.userId, userId));
  await db.delete(feedCache).where(eq(feedCache.userId, userId));
  await db.delete(vibeTags).where(eq(vibeTags.userId, userId));
  await db.delete(userPlatforms).where(eq(userPlatforms.userId, userId));
  await db.delete(tasteProfile).where(eq(tasteProfile.userId, userId));
  await db.delete(dismissedItems).where(eq(dismissedItems.userId, userId));
  await db.delete(watched).where(eq(watched.userId, userId));
  await db.delete(watchlist).where(eq(watchlist.userId, userId));
  await db.delete(ratings).where(eq(ratings.userId, userId));
  // TODO: cancel active Stripe subscription via API before this line when Stripe is live
  await db.delete(communityLinkFlags).where(eq(communityLinkFlags.userId, userId));
  await db.delete(communityLinks).where(eq(communityLinks.userId, userId));
  await db.delete(users).where(eq(users.id, userId));

  return NextResponse.json({ ok: true });
}
