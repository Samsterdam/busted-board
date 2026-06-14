import { stripe as getStripeClient, isStripeEnabled } from "@/lib/stripe-server";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { MS_PER_SECOND } from "@/lib/config/durations";

// Stripe requires the raw body for signature verification — do NOT use request.json()
export const config = { api: { bodyParser: false } };

export async function POST(request: Request) {
  if (!isStripeEnabled()) {
    return Response.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const client = getStripeClient();
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) return Response.json({ error: "Missing stripe-signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = client.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return Response.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.customer || !session.subscription) break;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const stripeSub = await client.subscriptions.retrieve(subId, { expand: ["items"] });
        const periodEndTs = stripeSub.items.data[0]?.current_period_end;
        const periodEnd = periodEndTs ? new Date(periodEndTs * MS_PER_SECOND) : null;

        await db
          .update(subscriptions)
          .set({ stripeSubscriptionId: subId, status: "active", currentPeriodEnd: periodEnd, updatedAt: new Date() })
          .where(eq(subscriptions.stripeCustomerId, customerId));
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const itemPeriodEnd = sub.items.data[0]?.current_period_end;
        const periodEnd = itemPeriodEnd ? new Date(itemPeriodEnd * MS_PER_SECOND) : null;
        await db
          .update(subscriptions)
          .set({ status: sub.status as "active" | "canceled" | "past_due", currentPeriodEnd: periodEnd, updatedAt: new Date() })
          .where(eq(subscriptions.stripeCustomerId, customerId));
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        await db
          .update(subscriptions)
          .set({ status: "canceled", updatedAt: new Date() })
          .where(eq(subscriptions.stripeCustomerId, customerId));
        break;
      }
    }
  } catch {
    return Response.json({ error: "Webhook handler error" }, { status: 500 });
  }

  return Response.json({ received: true });
}
