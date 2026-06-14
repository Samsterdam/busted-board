import Stripe from "stripe";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { STRIPE_MONTHLY_PRICE_ID, STRIPE_ANNUAL_PRICE_ID } from "@/lib/config/stripe";

export function isStripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

// Lazy singleton — only instantiated when Stripe is actually configured.
// Importing this module does NOT throw if STRIPE_SECRET_KEY is absent.
let _stripe: Stripe | null = null;
function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing)");
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-05-27.dahlia",
    });
  }
  return _stripe;
}

// Export as a getter so callers use getStripeClient() when they need the client.
export { getStripeClient as stripe };

export async function getSubscriptionStatus(userId: string): Promise<{
  status: "active" | "canceled" | "past_due";
  currentPeriodEnd: Date | null;
} | null> {
  if (!isStripeEnabled()) return null;
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  if (!row) return null;
  return {
    status: row.status as "active" | "canceled" | "past_due",
    currentPeriodEnd: row.currentPeriodEnd ?? null,
  };
}

export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const client = getStripeClient();
  const [row] = await db
    .select({ stripeCustomerId: subscriptions.stripeCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (row?.stripeCustomerId) return row.stripeCustomerId;

  const customer = await client.customers.create({ email, metadata: { userId } });

  await db
    .insert(subscriptions)
    .values({ userId, stripeCustomerId: customer.id, status: "active" })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: { stripeCustomerId: customer.id },
    });

  return customer.id;
}

export async function createCheckoutSession(
  customerId: string,
  billingCycle: "monthly" | "annual",
  returnUrl: string
): Promise<string> {
  const client = getStripeClient();
  const priceId = billingCycle === "annual" ? STRIPE_ANNUAL_PRICE_ID : STRIPE_MONTHLY_PRICE_ID;
  const session = await client.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${returnUrl}?upgraded=1`,
    cancel_url: returnUrl,
  });
  return session.url!;
}

export async function getCustomerPortalUrl(customerId: string, returnUrl: string): Promise<string> {
  const client = getStripeClient();
  const session = await client.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}
