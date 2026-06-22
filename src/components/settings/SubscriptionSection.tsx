"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { WATCHLIST_FREE_LIMIT } from "@/lib/config/stripe";
import posthog from "posthog-js";
import { EVENTS } from "@/lib/config/analytics";

interface SubscriptionStatus {
  status: "free" | "active" | "canceled" | "past_due";
  currentPeriodEnd?: string;
  stripeEnabled?: boolean;
}

export function SubscriptionSection() {
  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    fetch("/api/user/subscription")
      .then((r) => r.json())
      .then((d) => setSub(d as SubscriptionStatus))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  async function handleUpgrade(billingCycle: "monthly" | "annual") {
    posthog.capture(EVENTS.UPGRADE_CTA_CLICKED, { billingCycle });
    setUpgrading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingCycle }),
      });
      const data = await res.json() as { checkoutUrl?: string; error?: string };
      if (!res.ok || !data.checkoutUrl) {
        toast.error(data.error ?? "Could not start checkout. Try again.");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      toast.error("Could not start checkout. Try again.");
    } finally {
      setUpgrading(false);
    }
  }

  function handleManage() {
    window.location.href = "/api/billing/portal";
  }

  const isFree = !sub || sub.status === "free" || sub.status === "canceled";
  const isActive = sub?.status === "active";
  const isPastDue = sub?.status === "past_due";
  const stripeEnabled = sub?.stripeEnabled !== false;

  const didTrackUpgradeView = useRef(false);
  useEffect(() => {
    if (!loading && isFree && stripeEnabled && !didTrackUpgradeView.current) {
      didTrackUpgradeView.current = true;
      posthog.capture(EVENTS.UPGRADE_PROMPT_VIEWED);
    }
  }, [loading, isFree, stripeEnabled]);

  const periodEndLabel = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <section aria-labelledby="subscription-heading">
      <h2 id="subscription-heading" className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Plan
      </h2>
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        {loading ? (
          <div className="h-8 rounded-lg bg-muted animate-pulse" />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {isActive ? "Busted Board Pro" : isFree ? (stripeEnabled ? "Free" : "Beta") : "Canceled"}
                </p>
                {isActive && periodEndLabel && (
                  <p className="text-xs text-muted-foreground">Renews {periodEndLabel}</p>
                )}
                {isPastDue && (
                  <p className="text-xs text-destructive">Payment failed — update your payment method to restore access.</p>
                )}
                {isFree && stripeEnabled && (
                  <p className="text-xs text-muted-foreground">
                    Save up to {WATCHLIST_FREE_LIMIT} titles on your watchlist.
                  </p>
                )}
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                isActive ? "bg-primary/10 text-primary" :
                isPastDue ? "bg-destructive/10 text-destructive" :
                "bg-muted text-muted-foreground"
              }`}>
                {isActive ? "Active" : isPastDue ? "Past due" : stripeEnabled ? "Free" : "Beta"}
              </span>
            </div>

            {isFree && !stripeEnabled && (
              <p className="text-xs text-muted-foreground">
                Busted Board is free during beta. Paid plans are coming — you&apos;ll hear about it first.
              </p>
            )}

            {isFree && stripeEnabled && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Upgrade for unlimited watchlist, priority support, and supporter badge.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleUpgrade("annual")}
                    disabled={upgrading}
                    className="flex-1 bg-primary text-primary-foreground"
                  >
                    {upgrading ? "Loading…" : "$25 / year"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleUpgrade("monthly")}
                    disabled={upgrading}
                    className="border-border"
                  >
                    $3 / mo
                  </Button>
                </div>
              </div>
            )}

            {(isActive || isPastDue) && (
              <Button variant="outline" onClick={handleManage} className="w-full border-border">
                Manage subscription
              </Button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
