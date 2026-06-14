import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userPlatforms, ratings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { SurpriseView } from "@/components/surprise/SurpriseView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Surprise Me — Busted Board" };

export default async function SurprisePage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const [platforms, allRatings] = await Promise.all([
    db.select().from(userPlatforms).where(eq(userPlatforms.userId, userId)),
    db.select({ id: ratings.id }).from(ratings).where(eq(ratings.userId, userId)).limit(1),
  ]);

  if (platforms.length === 0 && allRatings.length === 0) redirect("/setup");
  if (platforms.length === 0) redirect("/settings");

  return <SurpriseView />;
}
