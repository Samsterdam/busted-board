import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userPlatforms, feedCache, tasteProfile, ratings, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { buildFeed, buildMoreFeed } from "@/lib/recommendation-engine";
import { PLATFORM_REGISTRY } from "@/lib/platforms";

const CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "1";
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const seenIds = (url.searchParams.get("seenIds") ?? "").split(",").map(Number).filter(Boolean);

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const platforms = await db.select().from(userPlatforms).where(eq(userPlatforms.userId, userId));
  const platformTmdbIds = platforms
    .map((p) => PLATFORM_REGISTRY.find((r) => r.slug === p.platformSlug)?.tmdbId)
    .filter((id): id is number => id != null);

  if (page >= 2) {
    const more = await buildMoreFeed(userId, platformTmdbIds, user?.country ?? "US", seenIds, page);
    return Response.json({ feed: more, cached: false, page });
  }

  if (!forceRefresh) {
    const [cached] = await db.select().from(feedCache).where(eq(feedCache.userId, userId)).limit(1);
    if (cached) {
      const age = cached.generatedAt ? Date.now() - cached.generatedAt.getTime() : Infinity;
      if (age < CACHE_MAX_AGE_MS) {
        return Response.json({ feed: JSON.parse(cached.recommendations), cached: true });
      }
    }
  }

  const allRatings = await db.select().from(ratings).where(eq(ratings.userId, userId));
  if (allRatings.length < 1) return Response.json({ feed: [], needsRatings: true });

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
    const feed = await buildFeed(userId, platformTmdbIds, user?.country ?? "US", parsedProfile);

    const [existing] = await db.select().from(feedCache).where(eq(feedCache.userId, userId)).limit(1);
    if (existing) {
      await db.update(feedCache).set({ recommendations: JSON.stringify(feed), generatedAt: new Date() }).where(eq(feedCache.userId, userId));
    } else {
      await db.insert(feedCache).values({ userId, recommendations: JSON.stringify(feed) });
    }

    return Response.json({ feed, cached: false });
  } catch (err) {
    console.error("Feed generation failed:", err);
    const [stale] = await db.select().from(feedCache).where(eq(feedCache.userId, userId)).limit(1);
    if (stale) {
      return Response.json({ feed: JSON.parse(stale.recommendations), cached: true, stale: true, error: "AI recommendations temporarily unavailable" });
    }
    return Response.json({ feed: [], error: "Could not generate recommendations" }, { status: 503 });
  }
}
