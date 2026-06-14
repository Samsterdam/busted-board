import { auth } from "@/auth";
import { getSubscriptionStatus } from "@/lib/stripe-server";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await getSubscriptionStatus(userId);
  if (!sub) return Response.json({ status: "free" });

  return Response.json({
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
  });
}
