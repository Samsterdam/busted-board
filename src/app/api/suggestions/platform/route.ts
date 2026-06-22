import { auth } from "@/auth";
import { db } from "@/lib/db";
import { platformSuggestions } from "@/lib/schema";
import { and, eq, gte } from "drizzle-orm";
import {
  MAX_PLATFORM_SUGGESTIONS_PER_USER_PER_DAY,
  ONE_DAY_MS,
  SUGGESTION_PLATFORM_NAME_MAX_LENGTH,
  SUGGESTION_NOTES_MAX_LENGTH,
  SUGGESTION_URL_MAX_LENGTH,
} from "@/lib/config/suggestions";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    name: string;
    websiteUrl?: string;
    notes?: string;
  };

  if (!body.name?.trim()) {
    return Response.json({ error: "Platform name is required" }, { status: 400 });
  }
  if (body.name.length > SUGGESTION_PLATFORM_NAME_MAX_LENGTH) {
    return Response.json(
      { error: `Platform name must be ${SUGGESTION_PLATFORM_NAME_MAX_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }
  if (body.websiteUrl && body.websiteUrl.length > SUGGESTION_URL_MAX_LENGTH) {
    return Response.json({ error: "Website URL too long" }, { status: 400 });
  }
  if (body.notes && body.notes.length > SUGGESTION_NOTES_MAX_LENGTH) {
    return Response.json(
      { error: `Notes must be ${SUGGESTION_NOTES_MAX_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }

  const oneDayAgo = new Date(Date.now() - ONE_DAY_MS);
  const recentCount = await db
    .select({ id: platformSuggestions.id })
    .from(platformSuggestions)
    .where(
      and(
      eq(platformSuggestions.userId, userId),
      gte(platformSuggestions.submittedAt, oneDayAgo)
    )
    );
  if (recentCount.length >= MAX_PLATFORM_SUGGESTIONS_PER_USER_PER_DAY) {
    return Response.json({ error: "Daily suggestion limit reached" }, { status: 429 });
  }

  const [result] = await db
    .insert(platformSuggestions)
    .values({
      userId,
      name: body.name.trim(),
      websiteUrl: body.websiteUrl ?? null,
      notes: body.notes ?? null,
    })
    .returning({ id: platformSuggestions.id });

  return Response.json({ id: result?.id, created: true });
}
