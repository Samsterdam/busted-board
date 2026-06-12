import { PageShell } from "@/components/layout/PageShell";
import { RecommendationFeed } from "@/components/feed/RecommendationFeed";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ratings, userPlatforms } from "@/lib/schema";
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

  return (
    <PageShell>
      <RecommendationFeed
        userId={userId}
        ratingCount={allRatings.length}
        platformNames={platforms.map((p) => p.platformName)}
      />
    </PageShell>
  );
}
