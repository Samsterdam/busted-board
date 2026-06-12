import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userPlatforms, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { discoverMovies, discoverShows } from "@/lib/tmdb";
import { enrichToFeedItems, type DiscoverResult } from "@/lib/recommendation-engine";
import { getCollection, DEFAULT_BROWSE_PARAMS } from "@/lib/collections";
import { PLATFORM_REGISTRY } from "@/lib/platforms";

// Cap how many raw results get a providers + scores lookup. Each costs network
// calls; the feed only renders a screenful at a time regardless.
const MAX_ENRICH = 40;

type MediaTypeParam = "movie" | "tv" | "all";

function resolveMediaTypes(
  requested: MediaTypeParam,
  collectionMediaType: "movie" | "tv" | "both" | null
): ("movie" | "tv")[] {
  // A type-locked collection (e.g. Bingeable = tv) always wins.
  if (collectionMediaType === "movie") return ["movie"];
  if (collectionMediaType === "tv") return ["tv"];
  if (requested === "movie") return ["movie"];
  if (requested === "tv") return ["tv"];
  return ["movie", "tv"];
}

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const collectionId = url.searchParams.get("collectionId");
  const requested = (url.searchParams.get("mediaType") ?? "all") as MediaTypeParam;

  const collection = collectionId ? getCollection(collectionId) : undefined;
  if (collectionId && !collection) {
    return Response.json({ error: "Unknown collection" }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const region = user?.country ?? "US";
  const platforms = await db.select().from(userPlatforms).where(eq(userPlatforms.userId, userId));
  const platformTmdbIds = platforms
    .map((p) => PLATFORM_REGISTRY.find((r) => r.slug === p.platformSlug)?.tmdbId)
    .filter((id): id is number => id != null);

  if (platformTmdbIds.length === 0) return Response.json({ feed: [] });

  const mediaTypes = resolveMediaTypes(requested, collection?.mediaType ?? null);

  const buckets = await Promise.all(
    mediaTypes.map(async (mt): Promise<DiscoverResult[]> => {
      const params = collection
        ? (mt === "tv" ? collection.tvParams : collection.movieParams) ?? {}
        : DEFAULT_BROWSE_PARAMS;
      try {
        if (mt === "tv") {
          const res = await discoverShows(params);
          return (res.results ?? []).map((r) => ({ ...r, media_type: "tv" as const }));
        }
        const res = await discoverMovies(params);
        return (res.results ?? []).map((r) => ({ ...r, media_type: "movie" as const }));
      } catch {
        return [];
      }
    })
  );

  // Interleave movie/tv so a "both" browse isn't all-movies-then-all-tv, then
  // dedup by (type, id) — TMDB ids collide across the movie and tv namespaces.
  const merged: DiscoverResult[] = [];
  const seen = new Set<string>();
  const maxLen = Math.max(...buckets.map((b) => b.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const bucket of buckets) {
      const item = bucket[i];
      if (!item) continue;
      const key = `${item.media_type}:${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }

  const feed = await enrichToFeedItems(merged.slice(0, MAX_ENRICH), platformTmdbIds, region);
  return Response.json({ feed });
}
