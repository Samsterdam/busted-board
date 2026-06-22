import { auth } from "@/auth";
import { db } from "@/lib/db";
import { communityLinks } from "@/lib/schema";
import { eq, and, lt, gte } from "drizzle-orm";
import {
  validateCommunityUrl,
  MAX_LINKS_PER_MEDIA,
  MAX_LINKS_PER_USER_PER_MEDIA,
  MAX_SUBMISSIONS_PER_USER_PER_DAY,
  LINK_LABEL_MAX_LENGTH,
  LINK_URL_MAX_LENGTH,
  FLAG_AUTO_HIDE_THRESHOLD,
} from "@/lib/config/community";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tmdbId = parseInt(url.searchParams.get("tmdbId") ?? "");
  const tmdbType = url.searchParams.get("tmdbType");

  if (!tmdbId || !tmdbType) {
    return Response.json({ error: "Missing tmdbId or tmdbType" }, { status: 400 });
  }

  const links = await db
    .select({
      id: communityLinks.id,
      url: communityLinks.url,
      domain: communityLinks.domain,
      label: communityLinks.label,
      submittedAt: communityLinks.submittedAt,
    })
    .from(communityLinks)
    .where(
      and(
        eq(communityLinks.tmdbId, tmdbId),
        eq(communityLinks.tmdbType, tmdbType),
        eq(communityLinks.status, "approved"),
        lt(communityLinks.flagCount, FLAG_AUTO_HIDE_THRESHOLD)
      )
    );

  return Response.json({ links });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    tmdbId: number;
    tmdbType: string;
    url: string;
    label?: string;
  };

  if (!body.tmdbId || !body.tmdbType || !body.url) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (body.tmdbType !== "movie" && body.tmdbType !== "tv") {
    return Response.json({ error: "Invalid tmdbType" }, { status: 400 });
  }
  if (body.url.length > LINK_URL_MAX_LENGTH) {
    return Response.json({ error: "URL too long" }, { status: 400 });
  }

  const parsed = validateCommunityUrl(body.url);
  if (!parsed) {
    let domain: string | undefined;
    try { domain = new URL(body.url).hostname.toLowerCase(); } catch { /* invalid URL */ }
    return Response.json(
      { error: "domain_not_allowed", domain, message: "URL must be from an allowed streaming domain" },
      { status: 400 }
    );
  }

  if (body.label && body.label.length > LINK_LABEL_MAX_LENGTH) {
    return Response.json({ error: `Label must be ${LINK_LABEL_MAX_LENGTH} characters or fewer` }, { status: 400 });
  }

  // Reject duplicate URL for this title (return existing id instead)
  const [existing] = await db
    .select({ id: communityLinks.id })
    .from(communityLinks)
    .where(
      and(
        eq(communityLinks.tmdbId, body.tmdbId),
        eq(communityLinks.tmdbType, body.tmdbType),
        eq(communityLinks.url, body.url)
      )
    )
    .limit(1);

  if (existing) {
    return Response.json({ id: existing.id, created: false });
  }

  // Global per-media cap
  const allLinksForMedia = await db
    .select({ id: communityLinks.id })
    .from(communityLinks)
    .where(
      and(
        eq(communityLinks.tmdbId, body.tmdbId),
        eq(communityLinks.tmdbType, body.tmdbType),
        eq(communityLinks.status, "approved")
      )
    );
  if (allLinksForMedia.length >= MAX_LINKS_PER_MEDIA) {
    return Response.json({ error: "This title has reached the maximum number of community links" }, { status: 400 });
  }

  // Per-user per-media cap
  const userLinksForMedia = await db
    .select({ id: communityLinks.id })
    .from(communityLinks)
    .where(
      and(
        eq(communityLinks.userId, userId),
        eq(communityLinks.tmdbId, body.tmdbId),
        eq(communityLinks.tmdbType, body.tmdbType)
      )
    );
  if (userLinksForMedia.length >= MAX_LINKS_PER_USER_PER_MEDIA) {
    return Response.json({ error: "You have already submitted the maximum links for this title" }, { status: 400 });
  }

  // Daily user submission rate limit
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todaySubmissions = await db
    .select({ id: communityLinks.id })
    .from(communityLinks)
    .where(
      and(
        eq(communityLinks.userId, userId),
        gte(communityLinks.submittedAt, startOfDay)
      )
    );
  if (todaySubmissions.length >= MAX_SUBMISSIONS_PER_USER_PER_DAY) {
    return Response.json({ error: "Daily submission limit reached" }, { status: 429 });
  }

  const [result] = await db
    .insert(communityLinks)
    .values({
      userId,
      tmdbId: body.tmdbId,
      tmdbType: body.tmdbType,
      url: body.url,
      domain: parsed.hostname,
      label: body.label ?? null,
      submittedAt: new Date(),
    })
    .returning({ id: communityLinks.id });

  return Response.json({ id: result?.id, created: true });
}
