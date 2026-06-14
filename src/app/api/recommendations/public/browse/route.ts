import { db } from "@/lib/db";
import { media, mediaLinks, platforms } from "@/lib/schema";
import { eq, and, desc, isNotNull } from "drizzle-orm";

export interface PublicMediaItem {
  tmdbId: number;
  tmdbType: string;
  title: string;
  releaseYear: number | null;
  posterPath: string | null;
  motnRating: number | null;
  platforms: string[];
}

const DEFAULT_REGION = "US";
const BROWSE_LIMIT = 48;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const platformSlug = url.searchParams.get("platform") ?? null;
  const region = url.searchParams.get("region") ?? DEFAULT_REGION;

  // Join media ↔ mediaLinks ↔ platforms; one row per (media, platform).
  // Group in JS to collect platform names per media item.
  const rows = await db
    .select({
      tmdbId: media.tmdbId,
      tmdbType: media.tmdbType,
      title: media.title,
      releaseYear: media.releaseYear,
      posterPath: media.posterPath,
      motnRating: media.motnRating,
      platformName: platforms.name,
      platformSlug: platforms.slug,
    })
    .from(media)
    .innerJoin(mediaLinks, eq(mediaLinks.mediaId, media.id))
    .innerJoin(platforms, eq(platforms.id, mediaLinks.platformId))
    .where(
      and(
        eq(mediaLinks.region, region),
        isNotNull(media.motnRating),
        platformSlug ? eq(platforms.slug, platformSlug) : undefined
      )
    )
    .orderBy(desc(media.motnRating));

  // Group by tmdbId, collecting all platform names per item.
  const byId = new Map<number, PublicMediaItem>();
  for (const row of rows) {
    if (!byId.has(row.tmdbId)) {
      byId.set(row.tmdbId, {
        tmdbId: row.tmdbId,
        tmdbType: row.tmdbType,
        title: row.title,
        releaseYear: row.releaseYear,
        posterPath: row.posterPath,
        motnRating: row.motnRating,
        platforms: [],
      });
    }
    byId.get(row.tmdbId)!.platforms.push(row.platformName);
  }

  // Re-sort after grouping (Map preserves insertion order = motnRating desc).
  const items = Array.from(byId.values()).slice(0, BROWSE_LIMIT);
  return Response.json({ items });
}
