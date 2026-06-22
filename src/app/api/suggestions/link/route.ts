import { auth } from "@/auth";
import { db } from "@/lib/db";
import { linkSuggestions } from "@/lib/schema";
import { and, eq, gte } from "drizzle-orm";
import { DOMAIN_ALLOWLIST, parseSubmittedUrl } from "@/lib/config/community";
import {
  MAX_LINK_SUGGESTIONS_PER_USER_PER_DAY,
  ONE_DAY_MS,
  SUGGESTION_URL_MAX_LENGTH,
  SUGGESTION_LABEL_MAX_LENGTH,
  SUGGESTION_NOTES_MAX_LENGTH,
} from "@/lib/config/suggestions";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    tmdbId: number;
    tmdbType: string;
    mediaTitle?: string;
    url: string;
    label?: string;
  };

  if (!body.tmdbId || !body.tmdbType || !body.url) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (body.tmdbType !== "movie" && body.tmdbType !== "tv") {
    return Response.json({ error: "Invalid tmdbType" }, { status: 400 });
  }
  if (body.url.length > SUGGESTION_URL_MAX_LENGTH) {
    return Response.json({ error: "URL too long" }, { status: 400 });
  }
  if (body.label && body.label.length > SUGGESTION_LABEL_MAX_LENGTH) {
    return Response.json(
      { error: `Label must be ${SUGGESTION_LABEL_MAX_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }
  if (body.mediaTitle && body.mediaTitle.length > SUGGESTION_NOTES_MAX_LENGTH) {
    return Response.json({ error: "Media title too long" }, { status: 400 });
  }

  const parsed = parseSubmittedUrl(body.url);
  if (!parsed) {
    return Response.json({ error: "URL must be http or https" }, { status: 400 });
  }

  const isAllowlisted = DOMAIN_ALLOWLIST.some(
    (d) => parsed.hostname === d || parsed.hostname.endsWith("." + d)
  );
  if (isAllowlisted) {
    return Response.json(
      { error: "domain_already_allowed", message: "This domain is already approved — use the community link form instead" },
      { status: 400 }
    );
  }

  // Unique constraint: one suggestion per (tmdbId, tmdbType, url) across all users
  const [existing] = await db
    .select({ id: linkSuggestions.id })
    .from(linkSuggestions)
    .where(
      and(
        eq(linkSuggestions.tmdbId, body.tmdbId),
        eq(linkSuggestions.tmdbType, body.tmdbType),
        eq(linkSuggestions.url, body.url)
      )
    )
    .limit(1);
  if (existing) {
    return Response.json({ error: "already_suggested" }, { status: 409 });
  }

  const oneDayAgo = new Date(Date.now() - ONE_DAY_MS);
  const recentCount = await db
    .select({ id: linkSuggestions.id })
    .from(linkSuggestions)
    .where(
      and(
        eq(linkSuggestions.userId, userId),
        gte(linkSuggestions.submittedAt, oneDayAgo)
      )
    );
  if (recentCount.length >= MAX_LINK_SUGGESTIONS_PER_USER_PER_DAY) {
    return Response.json({ error: "Daily suggestion limit reached" }, { status: 429 });
  }

  const [result] = await db
    .insert(linkSuggestions)
    .values({
      userId,
      tmdbId: body.tmdbId,
      tmdbType: body.tmdbType,
      mediaTitle: body.mediaTitle ?? null,
      url: body.url,
      domain: parsed.hostname,
      label: body.label ?? null,
    })
    .returning({ id: linkSuggestions.id });

  return Response.json({ id: result?.id, created: true });
}
