import { NextRequest } from "next/server";
import { getOrCreateUser, getUserIdFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratings, tasteProfile } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { generateTasteProfile } from "@/lib/gemini";

const REGEN_COOLDOWN_MS = 5 * 60 * 1000;

export async function POST(request: NextRequest) {
  const user = await getOrCreateUser();

  // Cooldown check
  const existing = db.select().from(tasteProfile).where(eq(tasteProfile.userId, user.id)).get();
  if (existing?.lastGeneratedAt) {
    const age = Date.now() - new Date(existing.lastGeneratedAt).getTime();
    if (age < REGEN_COOLDOWN_MS) {
      return Response.json({ error: "Please wait before regenerating" }, { status: 429 });
    }
  }

  const allRatings = db.select().from(ratings).where(eq(ratings.userId, user.id)).all();

  if (allRatings.length < 3) {
    return Response.json({ error: "Rate at least 3 movies first" }, { status: 400 });
  }

  const result = await generateTasteProfile(
    allRatings.map((r) => ({
      title: r.title,
      year: "",
      rating: r.rating,
      notes: r.notes,
      genres: [],
    }))
  );

  if (!result) {
    return Response.json({ error: "Could not generate profile. Try again later." }, { status: 503 });
  }

  const now = new Date();
  if (existing) {
    db.update(tasteProfile).set({
      topThemes: JSON.stringify(result.top_themes),
      avoidThemes: JSON.stringify(result.avoid_themes),
      favDirectors: JSON.stringify(result.fav_directors),
      favActors: JSON.stringify(result.fav_actors),
      toneDescription: result.tone_description,
      recommendationStrategy: result.recommendation_strategy,
      lastGeneratedAt: now,
    }).where(eq(tasteProfile.userId, user.id)).run();
  } else {
    db.insert(tasteProfile).values({
      userId: user.id,
      topThemes: JSON.stringify(result.top_themes),
      avoidThemes: JSON.stringify(result.avoid_themes),
      favDirectors: JSON.stringify(result.fav_directors),
      favActors: JSON.stringify(result.fav_actors),
      toneDescription: result.tone_description,
      recommendationStrategy: result.recommendation_strategy,
      lastGeneratedAt: now,
    }).run();
  }

  return Response.json({ profile: result });
}

export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return Response.json({ profile: null });

  const profile = db.select().from(tasteProfile).where(eq(tasteProfile.userId, userId)).get();
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
