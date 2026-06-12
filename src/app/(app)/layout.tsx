import { BottomNav } from "@/components/layout/BottomNav";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userPlatforms } from "@/lib/schema";
import { eq } from "drizzle-orm";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const platforms = await db
    .select()
    .from(userPlatforms)
    .where(eq(userPlatforms.userId, userId));

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
