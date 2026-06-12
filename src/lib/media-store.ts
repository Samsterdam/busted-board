import { db } from "./db";
import { media, platforms, mediaLinks } from "./schema";
import { and, eq } from "drizzle-orm";
import { logoUrl, type WatchProvider, type WatchProviders } from "./tmdb";
import {
  PLATFORM_REGISTRY,
  ACCESSIBLE_PROVIDER_TYPES,
  getPlatformByTmdbId,
  type PlatformType,
} from "./platforms";

// Writers for the normalized media/platforms/media_links model. Everything here
// is best-effort and called from `getCachedWatchProviders`; a failure must never
// fail the originating request, so the callers wrap these in try/catch. Note the
// neon-http driver has no transactions, so multi-statement sequences here are not
// atomic — readers must not assume a media row always has links.

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface MediaInput {
  tmdbId: number;
  tmdbType: "movie" | "tv";
  title: string;
  releaseYear?: number | null;
  posterPath?: string | null;
}

/** Get-or-create the media row for (tmdbId, tmdbType); returns its id. */
export async function upsertMedia(input: MediaInput): Promise<number | null> {
  const values = {
    tmdbId: input.tmdbId,
    tmdbType: input.tmdbType,
    title: input.title,
    releaseYear: input.releaseYear ?? null,
    posterPath: input.posterPath ?? null,
  };
  try {
    const [row] = await db
      .insert(media)
      .values(values)
      .onConflictDoUpdate({
        target: [media.tmdbId, media.tmdbType],
        set: { title: values.title, releaseYear: values.releaseYear, posterPath: values.posterPath },
      })
      .returning({ id: media.id });
    return row?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Self-populating platform upsert keyed on TMDB provider id. The registry, when
 * it knows the provider, supplies the curated slug/name/type; otherwise they're
 * derived from the provider itself. Returns the platform id, or null on failure
 * (e.g. a slug collision against an unrelated row).
 */
export async function upsertPlatform(
  provider: WatchProvider,
  inferredType: PlatformType
): Promise<number | null> {
  const known = getPlatformByTmdbId(provider.provider_id);
  const slug = known?.slug ?? slugify(provider.provider_name);
  const name = known?.name ?? provider.provider_name;
  const type = known?.type ?? inferredType;
  const iconUrl = logoUrl(provider.logo_path);
  try {
    const [row] = await db
      .insert(platforms)
      .values({ slug, name, tmdbId: provider.provider_id, type, iconUrl })
      .onConflictDoUpdate({ target: platforms.tmdbId, set: { name, type, iconUrl } })
      .returning({ id: platforms.id });
    return row?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Sync-on-refresh: replace the link set for (mediaId, region) with the platforms
 * the media is currently accessible on, so departures are reflected (not just
 * additions). Only the accessible buckets (flatrate/free/ads) count as a link.
 */
export async function syncMediaLinks(
  mediaId: number,
  region: string,
  providers: WatchProviders
): Promise<void> {
  // Dedupe providers across buckets; the first (highest-priority) bucket a
  // provider appears in determines its inferred type.
  const accessible = new Map<number, { provider: WatchProvider; type: PlatformType }>();
  for (const bucket of ACCESSIBLE_PROVIDER_TYPES) {
    const type: PlatformType = bucket === "flatrate" ? "paid" : "free";
    for (const p of providers[bucket] ?? []) {
      if (!accessible.has(p.provider_id)) accessible.set(p.provider_id, { provider: p, type });
    }
  }

  const platformIds: number[] = [];
  for (const { provider, type } of accessible.values()) {
    const id = await upsertPlatform(provider, type);
    if (id != null) platformIds.push(id);
  }

  // Replace, don't append — the heart of sync-on-refresh.
  await db
    .delete(mediaLinks)
    .where(and(eq(mediaLinks.mediaId, mediaId), eq(mediaLinks.region, region)));

  if (platformIds.length > 0) {
    await db
      .insert(mediaLinks)
      .values(platformIds.map((platformId) => ({ mediaId, platformId, region })))
      .onConflictDoNothing();
  }
}

// --- Readers ----------------------------------------------------------------
// The point of the normalized model: relational queries the JSON blob can't
// serve. Backed by the indexes declared in schema.ts.

export interface PlatformRow {
  id: number;
  slug: string;
  name: string;
  type: string;
  iconUrl: string | null;
}

export interface MediaRow {
  id: number;
  tmdbId: number;
  tmdbType: string;
  title: string;
  releaseYear: number | null;
  posterPath: string | null;
}

/** Platforms a given media item is available on in a region. */
export async function platformsForMedia(mediaId: number, region: string): Promise<PlatformRow[]> {
  return db
    .select({
      id: platforms.id,
      slug: platforms.slug,
      name: platforms.name,
      type: platforms.type,
      iconUrl: platforms.iconUrl,
    })
    .from(mediaLinks)
    .innerJoin(platforms, eq(mediaLinks.platformId, platforms.id))
    .where(and(eq(mediaLinks.mediaId, mediaId), eq(mediaLinks.region, region)));
}

/** Media available on a given platform in a region. Served by the
 * (platform_id, region) index on media_links. */
export async function mediaOnPlatform(platformId: number, region: string): Promise<MediaRow[]> {
  return db
    .select({
      id: media.id,
      tmdbId: media.tmdbId,
      tmdbType: media.tmdbType,
      title: media.title,
      releaseYear: media.releaseYear,
      posterPath: media.posterPath,
    })
    .from(mediaLinks)
    .innerJoin(media, eq(mediaLinks.mediaId, media.id))
    .where(and(eq(mediaLinks.platformId, platformId), eq(mediaLinks.region, region)));
}

/** Convenience: media on a platform identified by slug (callers usually hold a
 * slug, not the internal id). Returns [] for an unknown slug. */
export async function mediaOnPlatformBySlug(slug: string, region: string): Promise<MediaRow[]> {
  const [p] = await db.select({ id: platforms.id }).from(platforms).where(eq(platforms.slug, slug)).limit(1);
  if (!p) return [];
  return mediaOnPlatform(p.id, region);
}

/**
 * Idempotent seed of the curated registry into the platforms table. Optional now
 * that platforms self-populate from traffic — useful to pre-fill known names/types
 * (and let the 16 known platforms exist before any availability fetch). Returns
 * the number of registry rows processed.
 */
export async function seedPlatforms(): Promise<number> {
  for (const p of PLATFORM_REGISTRY) {
    await db
      .insert(platforms)
      .values({ slug: p.slug, name: p.name, tmdbId: p.tmdbId, type: p.type, iconUrl: p.logoUrl ?? null })
      .onConflictDoUpdate({
        target: platforms.tmdbId,
        set: { slug: p.slug, name: p.name, type: p.type },
      });
  }
  return PLATFORM_REGISTRY.length;
}
