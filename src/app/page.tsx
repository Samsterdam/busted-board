import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ratings, userPlatforms } from "@/lib/schema";
import { PLATFORM_REGISTRY } from "@/lib/platforms";
import { eq } from "drizzle-orm";
import { PageShell } from "@/components/layout/PageShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { RecommendationFeed } from "@/components/feed/RecommendationFeed";
import { LandingPage } from "@/components/landing/LandingPage";
import { APP_URL } from "@/lib/config/app";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Busted Board — Find Something Great to Watch",
  description:
    "Personalized movie and TV recommendations based on your taste, your platforms, and what you've actually seen.",
  openGraph: {
    title: "Busted Board",
    description: "Personalized movie & TV picks for what you can actually watch.",
    url: APP_URL,
    siteName: "Busted Board",
    images: [{ url: `${APP_URL}/opengraph-image` }],
  },
  twitter: { card: "summary_large_image" },
};

export default async function RootPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return <LandingPage />;

  const [allRatings, platforms] = await Promise.all([
    db.select().from(ratings).where(eq(ratings.userId, userId)),
    db.select().from(userPlatforms).where(eq(userPlatforms.userId, userId)),
  ]);

  if (platforms.length === 0 && allRatings.length === 0) redirect("/setup");
  if (platforms.length === 0) redirect("/settings");

  const platformChips = platforms
    .map((p) => ({
      name: p.platformName,
      tmdbId: PLATFORM_REGISTRY.find((r) => r.slug === p.platformSlug)?.tmdbId ?? null,
    }))
    .filter((p): p is { name: string; tmdbId: number } => p.tmdbId != null);

  return (
    <PageShell>
      <RecommendationFeed ratingCount={allRatings.length} platforms={platformChips} />
      <BottomNav />
    </PageShell>
  );
}
