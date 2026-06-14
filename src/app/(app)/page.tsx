import { PageShell } from "@/components/layout/PageShell";
import { RecommendationFeed } from "@/components/feed/RecommendationFeed";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ratings, userPlatforms } from "@/lib/schema";
import { PLATFORM_REGISTRY } from "@/lib/platforms";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const [allRatings, platforms] = await Promise.all([
    db.select().from(ratings).where(eq(ratings.userId, userId)),
    db.select().from(userPlatforms).where(eq(userPlatforms.userId, userId)),
  ]);

  const platformChips = platforms
    .map((p) => ({
      name: p.platformName,
      tmdbId: PLATFORM_REGISTRY.find((r) => r.slug === p.platformSlug)?.tmdbId ?? null,
    }))
    .filter((p): p is { name: string; tmdbId: number } => p.tmdbId != null);

  return (
    <PageShell>
      <RecommendationFeed
        ratingCount={allRatings.length}
        platforms={platformChips}
      />
    </PageShell>
  );
}
