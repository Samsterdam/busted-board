import { BottomNav } from "@/components/layout/BottomNav";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPlatforms } from "@/lib/schema";
import { eq } from "drizzle-orm";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect("/setup");
  }

  const platforms = db
    .select()
    .from(userPlatforms)
    .where(eq(userPlatforms.userId, userId))
    .all();

  if (platforms.length === 0) {
    redirect("/setup");
  }

  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}
