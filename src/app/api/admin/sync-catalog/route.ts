import { auth } from "@/auth";
import { db } from "@/lib/db";
import { media, platforms, mediaLinks, feedCache } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { env } from "@/lib/env";
import { PLATFORM_REGISTRY } from "@/lib/platforms";
import { fetchMoTNMovies } from "@/lib/motn";
import { fetchWatchmodeMovies } from "@/lib/watchmode";
import {
  MOTN_SERVICE_IDS,
  WATCHMODE_SOURCE_IDS,
  CATALOG_MOVIES_PER_PLATFORM,
  CATALOG_WATCHMODE_LIMIT,
  CATALOG_SYNC_REGION,
} from "@/lib/config/catalog";

interface SyncResult {
  slug: string;
  source: "motn" | "watchmode";
  synced: number;
  error?: string;
}

async function upsertMediaAndLink(
  tmdbId: number,
  tmdbType: "movie",
  title: string,
  releaseYear: number | null,
  overview: string,
  posterPath: string | null,
  motnRating: number | null,
  platformDbId: number,
  region: string
): Promise<void> {
  // Upsert media row
  const [mediaRow] = await db
    .insert(media)
    .values({
      tmdbId,
      tmdbType,
      title,
      releaseYear,
      posterPath,
      overview,
      motnRating,
      syncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [media.tmdbId, media.tmdbType],
      set: { title, releaseYear, posterPath, overview, motnRating, syncedAt: new Date() },
    })
    .returning({ id: media.id });

  if (!mediaRow) return;

  // Insert media link (idempotent — skip if already exists)
  await db
    .insert(mediaLinks)
    .values({ mediaId: mediaRow.id, platformId: platformDbId, region })
    .onConflictDoNothing();
}

async function getOrCreatePlatformRow(
  slug: string,
  motnServiceId: string | undefined,
  watchmodeSourceId: number | undefined
): Promise<number | null> {
  // Find existing platform by slug
  const [existing] = await db
    .select({ id: platforms.id })
    .from(platforms)
    .where(eq(platforms.slug, slug))
    .limit(1);

  if (existing) {
    // Update the API IDs if we have them
    if (motnServiceId !== undefined || watchmodeSourceId !== undefined) {
      await db
        .update(platforms)
        .set({
          ...(motnServiceId !== undefined ? { motnServiceId } : {}),
          ...(watchmodeSourceId !== undefined ? { watchmodeSourceId } : {}),
        })
        .where(eq(platforms.id, existing.id));
    }
    return existing.id;
  }

  // Create from PLATFORM_REGISTRY if not yet seeded
  const reg = PLATFORM_REGISTRY.find((p) => p.slug === slug);
  if (!reg) return null;

  const [created] = await db
    .insert(platforms)
    .values({
      slug,
      name: reg.name,
      tmdbId: reg.tmdbId,
      type: reg.type,
      motnServiceId: motnServiceId ?? null,
      watchmodeSourceId: watchmodeSourceId ?? null,
    })
    .onConflictDoUpdate({
      target: platforms.slug,
      set: {
        motnServiceId: motnServiceId ?? null,
        watchmodeSourceId: watchmodeSourceId ?? null,
      },
    })
    .returning({ id: platforms.id });

  return created?.id ?? null;
}

async function clearPlatformLinks(platformDbId: number, region: string): Promise<void> {
  await db
    .delete(mediaLinks)
    .where(and(eq(mediaLinks.platformId, platformDbId), eq(mediaLinks.region, region)));
}

async function syncMoTNPlatform(slug: string, serviceId: string): Promise<SyncResult> {
  try {
    const movies = await fetchMoTNMovies(serviceId, "US", CATALOG_MOVIES_PER_PLATFORM);
    const platformDbId = await getOrCreatePlatformRow(slug, serviceId, undefined);
    if (platformDbId === null) return { slug, source: "motn", synced: 0, error: "platform row missing" };

    await clearPlatformLinks(platformDbId, CATALOG_SYNC_REGION);

    for (const m of movies) {
      try {
        await upsertMediaAndLink(
          m.tmdbId, "movie", m.title, m.releaseYear, m.overview, m.posterPath,
          m.motnRating, platformDbId, CATALOG_SYNC_REGION
        );
      } catch {
        // Skip individual failures — don't abort the whole platform sync
      }
    }

    return { slug, source: "motn", synced: movies.length };
  } catch (err) {
    return { slug, source: "motn", synced: 0, error: String(err) };
  }
}

async function syncWatchmodePlatform(slug: string, sourceId: number): Promise<SyncResult> {
  try {
    const movies = await fetchWatchmodeMovies([sourceId], CATALOG_WATCHMODE_LIMIT);
    const platformDbId = await getOrCreatePlatformRow(slug, undefined, sourceId);
    if (platformDbId === null) return { slug, source: "watchmode", synced: 0, error: "platform row missing" };

    await clearPlatformLinks(platformDbId, CATALOG_SYNC_REGION);

    for (const m of movies) {
      try {
        await upsertMediaAndLink(
          m.tmdbId, "movie", m.title, m.year, "", null, null,
          platformDbId, CATALOG_SYNC_REGION
        );
      } catch {
        // Skip individual failures
      }
    }

    return { slug, source: "watchmode", synced: movies.length };
  } catch (err) {
    return { slug, source: "watchmode", synced: 0, error: String(err) };
  }
}

export async function POST(request: Request) {
  // Auth: must be logged in
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Auth: must be admin email
  if (env.ADMIN_EMAIL && session.user.email !== env.ADMIN_EMAIL) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Auth: must supply the sync secret header
  const secret = request.headers.get("x-sync-secret");
  if (env.CATALOG_SYNC_SECRET && secret !== env.CATALOG_SYNC_SECRET) {
    return Response.json({ error: "Invalid sync secret" }, { status: 401 });
  }

  const url = new URL(request.url);
  const onlySlug = url.searchParams.get("slug"); // optional: sync a single platform

  const motnSlugs = Object.entries(MOTN_SERVICE_IDS).filter(
    ([slug]) => !onlySlug || slug === onlySlug
  );
  const watchmodeSlugs = Object.entries(WATCHMODE_SOURCE_IDS).filter(
    ([slug]) => !onlySlug || slug === onlySlug
  );

  // Fan out all platform fetches in parallel
  const results = await Promise.all([
    ...motnSlugs.map(([slug, serviceId]) => syncMoTNPlatform(slug, serviceId!)),
    ...watchmodeSlugs.map(([slug, sourceId]) => syncWatchmodePlatform(slug, sourceId!)),
  ]);

  // Invalidate all user feed caches so they get fresh recommendations
  await db.delete(feedCache);

  const totalSynced = results.reduce((sum, r) => sum + r.synced, 0);
  const errors = results.filter((r) => r.error);

  return Response.json({
    synced: totalSynced,
    platforms: Object.fromEntries(results.map((r) => [r.slug, r.synced])),
    errors: errors.length > 0 ? errors.map((r) => `${r.slug}: ${r.error}`) : undefined,
  });
}
