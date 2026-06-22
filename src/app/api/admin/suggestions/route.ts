import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  platformSuggestions,
  linkSuggestions,
  communityLinks,
  users,
} from "@/lib/schema";
import { and, eq, desc } from "drizzle-orm";
import { env } from "@/lib/env";
import { MAX_LINKS_PER_MEDIA } from "@/lib/config/community";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) return false;
  if (env.ADMIN_EMAIL && session.user.email !== env.ADMIN_EMAIL) return false;
  return true;
}

type SuggestionType = "platform" | "link";
type SuggestionStatus = "pending" | "approved" | "rejected";

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") ?? "platform") as SuggestionType;
  const status = (searchParams.get("status") ?? "pending") as SuggestionStatus;

  if (type === "platform") {
    const rows = await db
      .select({
        id: platformSuggestions.id,
        name: platformSuggestions.name,
        websiteUrl: platformSuggestions.websiteUrl,
        notes: platformSuggestions.notes,
        status: platformSuggestions.status,
        adminNotes: platformSuggestions.adminNotes,
        submittedAt: platformSuggestions.submittedAt,
        submitterEmail: users.email,
      })
      .from(platformSuggestions)
      .leftJoin(users, eq(platformSuggestions.userId, users.id))
      .where(eq(platformSuggestions.status, status))
      .orderBy(desc(platformSuggestions.submittedAt));
    return Response.json(rows);
  }

  const rows = await db
    .select({
      id: linkSuggestions.id,
      tmdbId: linkSuggestions.tmdbId,
      tmdbType: linkSuggestions.tmdbType,
      mediaTitle: linkSuggestions.mediaTitle,
      url: linkSuggestions.url,
      domain: linkSuggestions.domain,
      label: linkSuggestions.label,
      status: linkSuggestions.status,
      adminNotes: linkSuggestions.adminNotes,
      submittedAt: linkSuggestions.submittedAt,
      submitterEmail: users.email,
    })
    .from(linkSuggestions)
    .leftJoin(users, eq(linkSuggestions.userId, users.id))
    .where(eq(linkSuggestions.status, status))
    .orderBy(desc(linkSuggestions.submittedAt));
  return Response.json(rows);
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, type, status, adminNotes } = (await request.json()) as {
    id: number;
    type: SuggestionType;
    status: SuggestionStatus;
    adminNotes?: string;
  };

  if (!id || !type || !status) {
    return Response.json({ error: "id, type, and status are required" }, { status: 400 });
  }

  if (type === "platform") {
    await db
      .update(platformSuggestions)
      .set({ status, ...(adminNotes !== undefined ? { adminNotes } : {}) })
      .where(eq(platformSuggestions.id, id));
    return Response.json({ ok: true });
  }

  // Link suggestion: on approve, auto-promote to community_links
  if (status === "approved") {
    const [suggestion] = await db
      .select()
      .from(linkSuggestions)
      .where(eq(linkSuggestions.id, id))
      .limit(1);

    if (!suggestion) {
      return Response.json({ error: "Suggestion not found" }, { status: 404 });
    }

    const existingLinks = await db
      .select({ id: communityLinks.id })
      .from(communityLinks)
      .where(
        and(
          eq(communityLinks.tmdbId, suggestion.tmdbId),
          eq(communityLinks.tmdbType, suggestion.tmdbType),
          eq(communityLinks.status, "approved")
        )
      );

    if (existingLinks.length >= MAX_LINKS_PER_MEDIA) {
      return Response.json(
        { error: "cap_reached", message: `This title already has ${MAX_LINKS_PER_MEDIA} approved community links. Remove one before approving.` },
        { status: 409 }
      );
    }

    await db.insert(communityLinks).values({
      userId: suggestion.userId,
      tmdbId: suggestion.tmdbId,
      tmdbType: suggestion.tmdbType,
      url: suggestion.url,
      domain: suggestion.domain,
      label: suggestion.label,
      status: "approved",
      submittedAt: new Date(),
    });
  }

  await db
    .update(linkSuggestions)
    .set({ status, ...(adminNotes !== undefined ? { adminNotes } : {}) })
    .where(eq(linkSuggestions.id, id));

  return Response.json({ ok: true });
}
