import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userPlatforms, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { PLATFORM_REGISTRY } from "@/lib/platforms";
import { discoverMovies, discoverShows } from "@/lib/tmdb";
import { enrichToFeedItems, type DiscoverResult } from "@/lib/feed-enrichment";
import { genreNamesToIds } from "@/lib/collections";
import { SURPRISE_POOL_SIZE, SURPRISE_ENRICH_FACTOR } from "@/lib/config/surprise";
import { kidsDiscoverParams } from "@/lib/config/kids";

const SURPRISE_MIN_VOTES = "50";
const SURPRISE_MIN_RATING = "6";
const SURPRISE_MAX_PAGE = 8;

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const genre = url.searchParams.get("genre") ?? "";

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const platforms = await db.select().from(userPlatforms).where(eq(userPlatforms.userId, userId));
  const platformTmdbIds = platforms
    .map((p) => PLATFORM_REGISTRY.find((r) => r.slug === p.platformSlug)?.tmdbId)
    .filter((id): id is number => id != null);

  if (platformTmdbIds.length === 0) {
    return NextResponse.json({ error: "No platforms configured" }, { status: 400 });
  }

  const region = user?.country ?? "US";
  const kidsMode = !!user?.kidsMode;
  const providerStr = platformTmdbIds.join("|");
  const page = String(Math.floor(Math.random() * SURPRISE_MAX_PAGE) + 1);

  const movieGenreIds = genre ? genreNamesToIds([genre], "movie") : "";
  const tvGenreIds = genre ? genreNamesToIds([genre], "tv") : "";

  const movieParams: Record<string, string> = {
    sort_by: "vote_average.desc",
    "vote_count.gte": SURPRISE_MIN_VOTES,
    "vote_average.gte": SURPRISE_MIN_RATING,
    with_watch_providers: providerStr,
    watch_region: region,
    page,
  };
  if (movieGenreIds) movieParams.with_genres = movieGenreIds;

  const tvParams: Record<string, string> = {
    sort_by: "vote_average.desc",
    "vote_count.gte": SURPRISE_MIN_VOTES,
    "vote_average.gte": SURPRISE_MIN_RATING,
    with_watch_providers: providerStr,
    watch_region: region,
    page,
  };
  if (tvGenreIds) tvParams.with_genres = tvGenreIds;

  // Kid-safety overrides any user genre pick (its with_genres/cert wins).
  Object.assign(movieParams, kidsDiscoverParams("movie", kidsMode));
  Object.assign(tvParams, kidsDiscoverParams("tv", kidsMode));

  const [movieResults, tvResults] = await Promise.all([
    discoverMovies(movieParams).then((r) => r.results ?? []).catch(() => []),
    discoverShows(tvParams).then((r) => r.results ?? []).catch(() => []),
  ]);

  const combined: DiscoverResult[] = [
    ...movieResults.map((m) => ({ ...m, media_type: "movie" as const })),
    ...tvResults.map((t) => ({ ...t, media_type: "tv" as const })),
  ];

  // Shuffle before enrichment to vary which items get provider lookups
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  const enriched = await enrichToFeedItems(
    combined.slice(0, SURPRISE_POOL_SIZE * SURPRISE_ENRICH_FACTOR),
    platformTmdbIds,
    region,
    userId
  );

  // Fisher-Yates shuffle on enriched results for additional randomness
  for (let i = enriched.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [enriched[i], enriched[j]] = [enriched[j], enriched[i]];
  }

  const feed = enriched.slice(0, SURPRISE_POOL_SIZE);
  return NextResponse.json({ feed, empty: feed.length === 0 });
}
