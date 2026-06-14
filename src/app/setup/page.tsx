import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userPlatforms } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { SetupWizard } from "@/components/onboarding/SetupWizard";

export const metadata = { title: "Welcome to Busted Board" };

export default async function SetupPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const platforms = await db.select().from(userPlatforms).where(eq(userPlatforms.userId, userId));
  if (platforms.length > 0) redirect("/");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <SetupWizard />
    </div>
  );
}
