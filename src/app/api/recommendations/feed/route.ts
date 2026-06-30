import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userPlatforms, tasteProfile, ratings, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { buildFeed, buildMoreFeed } from "@/lib/recommendation-engine";
import { PLATFORM_REGISTRY } from "@/lib/platforms";
import { readCachePages, writeCachePage } from "@/lib/feed-cache";

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "1";
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const seenIds = (url.searchParams.get("seenIds") ?? "").split(",").map(Number).filter(Boolean);

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const userPlatformRows = await db.select().from(userPlatforms).where(eq(userPlatforms.userId, userId));
  const platformSlugs = userPlatformRows.map((p) => p.platformSlug);
  const platformTmdbIds = userPlatformRows
    .map((p) => PLATFORM_REGISTRY.find((r) => r.slug === p.platformSlug)?.tmdbId)
    .filter((id): id is number => id != null);

  const region = user?.country ?? "US";
  const kidsMode = !!user?.kidsMode;

  // Pages 2+: serve from cache when fresh, else build and cache.
  if (page >= 2) {
    const cached = forceRefresh ? null : await readCachePages(userId);
    const cachedPage = cached?.pages[String(page)];
    if (cachedPage) {
      return Response.json({ feed: cachedPage, cached: true, page });
    }
    const more = await buildMoreFeed(userId, platformTmdbIds, platformSlugs, region, seenIds, page, kidsMode);
    await writeCachePage(userId, page, more, cached?.pages ?? {});
    return Response.json({ feed: more, cached: false, page });
  }

  // Page 1: cache-first.
  if (!forceRefresh) {
    const cached = await readCachePages(userId);
    if (cached?.pages["1"]) {
      return Response.json({ feed: cached.pages["1"], cached: true });
    }
  }

  // Kids mode is generic (no taste profile), so it doesn't need prior ratings.
  const allRatings = await db.select().from(ratings).where(eq(ratings.userId, userId));
  if (allRatings.length < 1 && !kidsMode) return Response.json({ feed: [], needsRatings: true });

  const [profile] = await db.select().from(tasteProfile).where(eq(tasteProfile.userId, userId)).limit(1);
  const parsedProfile = profile?.topThemes ? {
    top_themes: JSON.parse(profile.topThemes ?? "[]"),
    avoid_themes: JSON.parse(profile.avoidThemes ?? "[]"),
    fav_directors: JSON.parse(profile.favDirectors ?? "[]"),
    fav_actors: JSON.parse(profile.favActors ?? "[]"),
    tone_description: profile.toneDescription ?? "",
    recommendation_strategy: profile.recommendationStrategy ?? "",
  } : null;

  try {
    const feed = await buildFeed(userId, platformTmdbIds, platformSlugs, region, parsedProfile, kidsMode);
    await writeCachePage(userId, 1, feed, {});
    return Response.json({ feed, cached: false });
  } catch (err) {
    console.error("Feed generation failed:", err);
    const stale = await readCachePages(userId);
    if (stale?.pages["1"]) {
      return Response.json({ feed: stale.pages["1"], cached: true, stale: true, error: "AI recommendations temporarily unavailable" });
    }
    return Response.json({ feed: [], error: "Could not generate recommendations" }, { status: 503 });
  }
}
