import { auth } from "@/auth";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getCustomerPortalUrl, isStripeEnabled } from "@/lib/stripe-server";
import { APP_URL } from "@/lib/config/app";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!isStripeEnabled()) return Response.json({ error: "Stripe not configured" }, { status: 503 });

  const [row] = await db
    .select({ stripeCustomerId: subscriptions.stripeCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!row?.stripeCustomerId) {
    return Response.json({ error: "No subscription found" }, { status: 404 });
  }

  const portalUrl = await getCustomerPortalUrl(row.stripeCustomerId, `${APP_URL}/settings`);
  return Response.redirect(portalUrl);
}
