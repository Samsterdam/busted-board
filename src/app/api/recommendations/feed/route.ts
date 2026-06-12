import { NextRequest } from "next/server";
import { getOrCreateUser, getUserIdFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPlatforms, feedCache, tasteProfile, ratings, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { buildFeed } from "@/lib/recommendation-engine";
import { PLATFORM_REGISTRY } from "@/lib/platforms";

const CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return Response.json({ error: "No session" }, { status: 401 });

  const forceRefresh = new URL(request.url).searchParams.get("refresh") === "1";

  // Return cached feed unless refresh requested
  if (!forceRefresh) {
    const cached = db.select().from(feedCache).where(eq(feedCache.userId, userId)).get();
    if (cached) {
      const age = Date.now() - new Date(cached.generatedAt).getTime();
      if (age < CACHE_MAX_AGE_MS) {
        return Response.json({ feed: JSON.parse(cached.recommendations), cached: true });
      }
    }
  }

  // Need enough ratings to build a useful feed
  const ratingCount = db.select().from(ratings).where(eq(ratings.userId, userId)).all().length;
  if (ratingCount < 1) {
    return Response.json({ feed: [], needsRatings: true });
  }

  // Get user's platforms + region
  const platforms = db.select().from(userPlatforms).where(eq(userPlatforms.userId, userId)).all();
  const user = db.select().from(users).where(eq(users.id, userId)).get();

  const platformTmdbIds = platforms
    .map((p) => PLATFORM_REGISTRY.find((r) => r.slug === p.platformSlug)?.tmdbId)
    .filter((id): id is number => id != null);

  // Get taste profile if available
  const profile = db.select().from(tasteProfile).where(eq(tasteProfile.userId, userId)).get();
  const parsedProfile = profile?.topThemes
    ? {
        top_themes: JSON.parse(profile.topThemes ?? "[]"),
        avoid_themes: JSON.parse(profile.avoidThemes ?? "[]"),
        fav_directors: JSON.parse(profile.favDirectors ?? "[]"),
        fav_actors: JSON.parse(profile.favActors ?? "[]"),
        tone_description: profile.toneDescription ?? "",
        recommendation_strategy: profile.recommendationStrategy ?? "",
      }
    : null;

  try {
    const feed = await buildFeed(userId, platformTmdbIds, user?.country ?? "US", parsedProfile);

    // Cache result
    const existing = db.select().from(feedCache).where(eq(feedCache.userId, userId)).get();
    if (existing) {
      db.update(feedCache)
        .set({ recommendations: JSON.stringify(feed), generatedAt: new Date() })
        .where(eq(feedCache.userId, userId))
        .run();
    } else {
      db.insert(feedCache)
        .values({ userId, recommendations: JSON.stringify(feed) })
        .run();
    }

    return Response.json({ feed, cached: false });
  } catch (err) {
    console.error("Feed generation failed:", err);

    // Fallback: return stale cache if available
    const stale = db.select().from(feedCache).where(eq(feedCache.userId, userId)).get();
    if (stale) {
      return Response.json({
        feed: JSON.parse(stale.recommendations),
        cached: true,
        stale: true,
        error: "AI recommendations temporarily unavailable",
      });
    }

    return Response.json({ feed: [], error: "Could not generate recommendations" }, { status: 503 });
  }
}
