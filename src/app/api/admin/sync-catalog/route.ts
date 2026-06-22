// Batch size for delete-by-ID operations (keeps SQL IN clauses manageable)
const DELETE_BATCH_SIZE = 100;

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { media, platforms, mediaLinks, feedCache, catalogSyncLog } from "@/lib/schema";
import { eq, and, gte, sum } from "drizzle-orm";
import { env } from "@/lib/env";
import { enrichCatalogData } from "@/lib/catalog-poster-warmup";
import { PLATFORM_REGISTRY } from "@/lib/platforms";
import { fetchMoTNTitles } from "@/lib/motn";
import { fetchWatchmodeTitles } from "@/lib/watchmode";
import {
  MOTN_SERVICE_IDS,
  WATCHMODE_SOURCE_IDS,
  CATALOG_MOVIES_PER_PLATFORM,
  CATALOG_SHOWS_PER_PLATFORM,
  CATALOG_WATCHMODE_LIMIT,
  CATALOG_WATCHMODE_SHOWS_LIMIT,
  CATALOG_SYNC_REGION,
  CATALOG_SYNC_COOLDOWN_MS,
  CATALOG_MOTN_SAFE_BUDGET,
  MOTN_PAGE_SIZE,
} from "@/lib/config/catalog";

type MediaType = "movie" | "tv";

interface PlatformSyncResult {
  count: number;
  skipped: boolean;
  reason: string | null;
  callsUsed: number;
}

async function getMonthlyMoTNCallsUsed(): Promise<number> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [row] = await db
    .select({ total: sum(catalogSyncLog.callsUsed) })
    .from(catalogSyncLog)
    .where(gte(catalogSyncLog.syncedAt, monthStart));

  return Number(row?.total ?? 0);
}

async function getLastSyncTime(slug: string, mediaType: MediaType): Promise<Date | null> {
  const [row] = await db
    .select({ syncedAt: catalogSyncLog.syncedAt })
    .from(catalogSyncLog)
    .where(and(eq(catalogSyncLog.slug, slug), eq(catalogSyncLog.mediaType, mediaType)))
    .limit(1);
  return row?.syncedAt ?? null;
}

async function upsertMediaAndLink(
  tmdbId: number,
  tmdbType: MediaType,
  title: string,
  releaseYear: number | null,
  overview: string,
  posterPath: string | null,
  motnRating: number | null,
  seasonCount: number | null,
  episodeCount: number | null,
  platformDbId: number,
  region: string
): Promise<void> {
  const [mediaRow] = await db
    .insert(media)
    .values({
      tmdbId, tmdbType, title, releaseYear, posterPath, overview,
      motnRating, seasonCount, episodeCount, syncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [media.tmdbId, media.tmdbType],
      set: {
        title, releaseYear,
        // Preserve an existing non-null posterPath — MOTN/Watchmode often lack image
        // data, and we'd lose a TMDB path stored by a prior sync or availability check.
        ...(posterPath !== null ? { posterPath } : {}),
        // Preserve an existing non-empty overview — Watchmode always passes "" and
        // would silently overwrite a real synopsis fetched from MOTN or TMDB.
        ...(overview ? { overview } : {}),
        motnRating, seasonCount, episodeCount, syncedAt: new Date(),
      },
    })
    .returning({ id: media.id });

  if (!mediaRow) return;

  await db
    .insert(mediaLinks)
    .values({ mediaId: mediaRow.id, platformId: platformDbId, region })
    .onConflictDoNothing();
}

async function getOrCreatePlatformRow(
  slug: string,
  motnServiceId?: string,
  watchmodeSourceId?: number
): Promise<number | null> {
  const [existing] = await db
    .select({ id: platforms.id })
    .from(platforms)
    .where(eq(platforms.slug, slug))
    .limit(1);

  if (existing) {
    if (motnServiceId !== undefined || watchmodeSourceId !== undefined) {
      await db.update(platforms).set({
        ...(motnServiceId !== undefined ? { motnServiceId } : {}),
        ...(watchmodeSourceId !== undefined ? { watchmodeSourceId } : {}),
      }).where(eq(platforms.id, existing.id));
    }
    return existing.id;
  }

  const reg = PLATFORM_REGISTRY.find((p) => p.slug === slug);
  if (!reg) return null;

  const [created] = await db
    .insert(platforms)
    .values({ slug, name: reg.name, tmdbId: reg.tmdbId, type: reg.type, motnServiceId, watchmodeSourceId })
    .onConflictDoUpdate({
      target: platforms.slug,
      set: { motnServiceId: motnServiceId ?? null, watchmodeSourceId: watchmodeSourceId ?? null },
    })
    .returning({ id: platforms.id });

  return created?.id ?? null;
}

async function clearPlatformTypeLinks(platformDbId: number, tmdbType: MediaType, region: string): Promise<void> {
  // Delete links for this platform+region where the media row is the given type.
  // We can't join in a DELETE directly with neon-http, so get IDs first then delete.
  const mediaRows = await db
    .select({ id: mediaLinks.id })
    .from(mediaLinks)
    .innerJoin(media, eq(media.id, mediaLinks.mediaId))
    .where(
      and(
        eq(mediaLinks.platformId, platformDbId),
        eq(mediaLinks.region, region),
        eq(media.tmdbType, tmdbType)
      )
    );

  if (mediaRows.length === 0) return;
  // Delete in batches to avoid huge IN clauses
  const ids = mediaRows.map((r) => r.id);
  for (let i = 0; i < ids.length; i += DELETE_BATCH_SIZE) {
    const batch = ids.slice(i, i + DELETE_BATCH_SIZE);
    for (const id of batch) {
      await db.delete(mediaLinks).where(eq(mediaLinks.id, id));
    }
  }
}

async function syncMoTNPlatform(
  slug: string,
  serviceId: string,
  mediaType: MediaType,
  budgetRemaining: number,
  force = false
): Promise<PlatformSyncResult> {
  // Estimate calls needed: MOVIES_PER_PLATFORM / PAGE_SIZE pages
  const limit = mediaType === "movie" ? CATALOG_MOVIES_PER_PLATFORM : CATALOG_SHOWS_PER_PLATFORM;
  const estimatedCalls = Math.ceil(limit / MOTN_PAGE_SIZE);

  if (estimatedCalls > budgetRemaining) {
    return { count: 0, skipped: true, reason: "budget", callsUsed: 0 };
  }

  if (!force) {
    const lastSync = await getLastSyncTime(slug, mediaType);
    if (lastSync && Date.now() - lastSync.getTime() < CATALOG_SYNC_COOLDOWN_MS) {
      return { count: 0, skipped: true, reason: "cooldown", callsUsed: 0 };
    }
  }

  try {
    const showType = mediaType === "movie" ? "movie" : "series";
    const titles = await fetchMoTNTitles(serviceId, "US", showType, limit);
    const callsUsed = Math.ceil(titles.length / MOTN_PAGE_SIZE) || 1;

    const platformDbId = await getOrCreatePlatformRow(slug, serviceId, undefined);
    if (!platformDbId) return { count: 0, skipped: true, reason: "platform row missing", callsUsed };

    await clearPlatformTypeLinks(platformDbId, mediaType, CATALOG_SYNC_REGION);

    for (const t of titles) {
      try {
        await upsertMediaAndLink(
          t.tmdbId, t.tmdbType, t.title, t.releaseYear, t.overview,
          t.posterPath, t.motnRating, t.seasonCount, t.episodeCount,
          platformDbId, CATALOG_SYNC_REGION
        );
      } catch { /* skip individual failures */ }
    }

    await db
      .insert(catalogSyncLog)
      .values({ slug, mediaType, syncedAt: new Date(), itemCount: titles.length, callsUsed })
      .onConflictDoUpdate({
        target: [catalogSyncLog.slug, catalogSyncLog.mediaType],
        set: { syncedAt: new Date(), itemCount: titles.length, callsUsed },
      });

    return { count: titles.length, skipped: false, reason: null, callsUsed };
  } catch (err) {
    return { count: 0, skipped: false, reason: String(err), callsUsed: 0 };
  }
}

async function syncWatchmodePlatform(
  slug: string,
  sourceId: number,
  mediaType: MediaType,
  force = false
): Promise<PlatformSyncResult> {
  if (!force) {
    const lastSync = await getLastSyncTime(slug, mediaType);
    if (lastSync && Date.now() - lastSync.getTime() < CATALOG_SYNC_COOLDOWN_MS) {
      return { count: 0, skipped: true, reason: "cooldown", callsUsed: 0 };
    }
  }

  try {
    const limit = mediaType === "movie" ? CATALOG_WATCHMODE_LIMIT : CATALOG_WATCHMODE_SHOWS_LIMIT;
    const titles = await fetchWatchmodeTitles([sourceId], mediaType, limit);

    const platformDbId = await getOrCreatePlatformRow(slug, undefined, sourceId);
    if (!platformDbId) return { count: 0, skipped: true, reason: "platform row missing", callsUsed: 0 };

    await clearPlatformTypeLinks(platformDbId, mediaType, CATALOG_SYNC_REGION);

    for (const t of titles) {
      try {
        await upsertMediaAndLink(
          t.tmdbId, t.tmdbType, t.title, t.year, "", null, null,
          null, null, platformDbId, CATALOG_SYNC_REGION
        );
      } catch { /* skip individual failures */ }
    }

    await db
      .insert(catalogSyncLog)
      .values({ slug, mediaType, syncedAt: new Date(), itemCount: titles.length, callsUsed: 1 })
      .onConflictDoUpdate({
        target: [catalogSyncLog.slug, catalogSyncLog.mediaType],
        set: { syncedAt: new Date(), itemCount: titles.length, callsUsed: 1 },
      });

    return { count: titles.length, skipped: false, reason: null, callsUsed: 0 };
  } catch (err) {
    return { count: 0, skipped: false, reason: String(err), callsUsed: 0 };
  }
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-sync-secret");
  const secretValid = env.CATALOG_SYNC_SECRET && secret === env.CATALOG_SYNC_SECRET;

  if (!secretValid) {
    // Fall back to session-based auth if secret not provided or not configured
    const session = await auth();
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (env.ADMIN_EMAIL && session.user.email !== env.ADMIN_EMAIL) return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const onlySlug = url.searchParams.get("slug");
  const force = url.searchParams.get("force") === "true";
  // Default: movies only (safer; use ?type=tv or ?type=all explicitly)
  const typeParam = url.searchParams.get("type") ?? "movie";
  const syncMovies = typeParam === "movie" || typeParam === "all";
  const syncTV = typeParam === "tv" || typeParam === "all";

  // Check remaining monthly budget before starting
  const callsUsedThisMonth = await getMonthlyMoTNCallsUsed();
  let budgetRemaining = Math.max(0, CATALOG_MOTN_SAFE_BUDGET - callsUsedThisMonth);

  const results: Record<string, PlatformSyncResult & { source: string }> = {};
  let totalCallsUsed = 0;

  const motnEntries = Object.entries(MOTN_SERVICE_IDS).filter(
    ([slug]) => !onlySlug || slug === onlySlug
  );
  const watchmodeEntries = Object.entries(WATCHMODE_SOURCE_IDS).filter(
    ([slug]) => !onlySlug || slug === onlySlug
  );

  // MOTN: fan out all services in parallel (per type)
  const motnJobs: Array<() => Promise<void>> = [];
  if (syncMovies) {
    for (const [slug, serviceId] of motnEntries) {
      motnJobs.push(async () => {
        const r = await syncMoTNPlatform(slug, serviceId!, "movie", budgetRemaining, force);
        results[`${slug}:movie`] = { ...r, source: "motn" };
        if (!r.skipped) { totalCallsUsed += r.callsUsed; budgetRemaining -= r.callsUsed; }
      });
    }
  }
  if (syncTV) {
    for (const [slug, serviceId] of motnEntries) {
      motnJobs.push(async () => {
        const r = await syncMoTNPlatform(slug, serviceId!, "tv", budgetRemaining, force);
        results[`${slug}:tv`] = { ...r, source: "motn" };
        if (!r.skipped) { totalCallsUsed += r.callsUsed; budgetRemaining -= r.callsUsed; }
      });
    }
  }
  await Promise.all(motnJobs.map((j) => j()));

  // Watchmode: sequential (low volume, no quota concern)
  for (const [slug, sourceId] of watchmodeEntries) {
    if (syncMovies) {
      const r = await syncWatchmodePlatform(slug, sourceId!, "movie", force);
      results[`${slug}:movie`] = { ...r, source: "watchmode" };
    }
    if (syncTV) {
      const r = await syncWatchmodePlatform(slug, sourceId!, "tv", force);
      results[`${slug}:tv`] = { ...r, source: "watchmode" };
    }
  }

  // Invalidate all feed caches — users get fresh recommendations
  await db.delete(feedCache);

  // Fetch TMDB data (poster + overview) for any catalog rows that still lack either.
  const catalogEnriched = await enrichCatalogData();

  const totalSynced = Object.values(results).reduce((s, r) => s + r.count, 0);
  const errors = Object.entries(results)
    .filter(([, r]) => !r.skipped && r.reason)
    .map(([k, r]) => `${k}: ${r.reason}`);

  return Response.json({
    synced: totalSynced,
    catalogEnriched,
    callsUsed: totalCallsUsed,
    budgetRemaining,
    platforms: results,
    errors: errors.length > 0 ? errors : undefined,
  });
}
