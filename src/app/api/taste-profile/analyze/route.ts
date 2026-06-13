import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ratings, tasteProfile } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { generateTasteProfile } from "@/lib/gemini";
import { TASTE_PROFILE_COOLDOWN_MS } from "@/lib/config/durations";
import { MIN_RATINGS_FOR_PROFILE } from "@/lib/config/ratings";

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [existing] = await db.select().from(tasteProfile).where(eq(tasteProfile.userId, userId)).limit(1);
  if (existing?.lastGeneratedAt) {
    const age = Date.now() - new Date(existing.lastGeneratedAt).getTime();
    if (age < TASTE_PROFILE_COOLDOWN_MS) {
      return Response.json({ error: "Please wait before regenerating" }, { status: 429 });
    }
  }

  const allRatings = await db.select().from(ratings).where(eq(ratings.userId, userId));
  if (allRatings.length < MIN_RATINGS_FOR_PROFILE) return Response.json({ error: "Rate at least 3 movies first" }, { status: 400 });

  const result = await generateTasteProfile(
    allRatings.map((r) => ({ title: r.title, year: "", rating: r.rating, notes: r.notes, genres: [] }))
  );
  if (!result) return Response.json({ error: "Could not generate profile. Try again later." }, { status: 503 });

  const now = new Date();
  if (existing) {
    await db.update(tasteProfile).set({
      topThemes: JSON.stringify(result.top_themes),
      avoidThemes: JSON.stringify(result.avoid_themes),
      favDirectors: JSON.stringify(result.fav_directors),
      favActors: JSON.stringify(result.fav_actors),
      toneDescription: result.tone_description,
      recommendationStrategy: result.recommendation_strategy,
      lastGeneratedAt: now,
    }).where(eq(tasteProfile.userId, userId));
  } else {
    await db.insert(tasteProfile).values({
      userId,
      topThemes: JSON.stringify(result.top_themes),
      avoidThemes: JSON.stringify(result.avoid_themes),
      favDirectors: JSON.stringify(result.fav_directors),
      favActors: JSON.stringify(result.fav_actors),
      toneDescription: result.tone_description,
      recommendationStrategy: result.recommendation_strategy,
      lastGeneratedAt: now,
    });
  }

  return Response.json({ profile: result });
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ profile: null });

  const [profile] = await db.select().from(tasteProfile).where(eq(tasteProfile.userId, userId)).limit(1);
  if (!profile?.topThemes) return Response.json({ profile: null });

  return Response.json({
    profile: {
      top_themes: JSON.parse(profile.topThemes ?? "[]"),
      avoid_themes: JSON.parse(profile.avoidThemes ?? "[]"),
      fav_directors: JSON.parse(profile.favDirectors ?? "[]"),
      fav_actors: JSON.parse(profile.favActors ?? "[]"),
      tone_description: profile.toneDescription,
      recommendation_strategy: profile.recommendationStrategy,
    },
    lastGeneratedAt: profile.lastGeneratedAt,
  });
}
