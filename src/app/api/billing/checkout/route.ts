import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getOrCreateStripeCustomer, createCheckoutSession, isStripeEnabled } from "@/lib/stripe-server";
import { APP_URL } from "@/lib/config/app";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!isStripeEnabled()) return Response.json({ error: "Stripe not configured" }, { status: 503 });

  const body = await request.json() as { billingCycle?: "monthly" | "annual" };
  const billingCycle = body.billingCycle === "annual" ? "annual" : "monthly";

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.email) return Response.json({ error: "User email not found" }, { status: 400 });

  const customerId = await getOrCreateStripeCustomer(userId, user.email);
  const checkoutUrl = await createCheckoutSession(customerId, billingCycle, `${APP_URL}/settings`);

  return Response.json({ checkoutUrl });
}
