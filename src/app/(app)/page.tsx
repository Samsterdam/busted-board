import { PageShell } from "@/components/layout/PageShell";
import { RecommendationFeed } from "@/components/feed/RecommendationFeed";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratings, userPlatforms } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const ratingCount = db.select().from(ratings).where(eq(ratings.userId, userId)).all().length;
  const platforms = db.select().from(userPlatforms).where(eq(userPlatforms.userId, userId)).all();

  return (
    <PageShell>
      <RecommendationFeed
        userId={userId}
        ratingCount={ratingCount}
        platformNames={platforms.map((p) => p.platformName)}
      />
    </PageShell>
  );
}
