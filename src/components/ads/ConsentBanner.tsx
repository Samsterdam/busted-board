"use client";

import { useEffect, useState } from "react";
import { readConsent, writeConsent, requireConsent } from "@/lib/ads/consent";

/**
 * Lightweight consent banner. Renders only when consent is required and the
 * user hasn't decided yet. On decision it stores a cookie and dispatches a
 * `bb-consent-change` event so <AdScripts> can react without a reload.
 */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (requireConsent() && readConsent() === null) setVisible(true);
  }, []);

  if (!visible) return null;

  function decide(value: "granted" | "denied") {
    writeConsent(value);
    window.dispatchEvent(new CustomEvent("bb-consent-change", { detail: value }));
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          We use cookies to show relevant ads and support the site. You can accept or
          decline personalized advertising.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => decide("denied")}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary"
          >
            Decline
          </button>
          <button
            onClick={() => decide("granted")}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
