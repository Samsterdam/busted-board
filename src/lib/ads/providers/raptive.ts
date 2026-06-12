import type { AdProvider } from "../types";

/**
 * Raptive (formerly AdThrive). Premium full-service manager; high traffic
 * threshold. Loads via the AdThrive ads bundle keyed by site id.
 */
export const raptive: AdProvider = {
  id: "raptive",
  name: "Raptive (AdThrive)",
  kind: "full-site",
  note: "Premium full-service. Auto-places ads; no inline slot markup needed.",
  envKeys: ["NEXT_PUBLIC_RAPTIVE_SITE_ID"],
  isConfigured: (env) => Boolean(env.NEXT_PUBLIC_RAPTIVE_SITE_ID),
  getScripts: (env) => [
    {
      id: "raptive-script",
      src: `https://ads.adthrive.com/sites/${env.NEXT_PUBLIC_RAPTIVE_SITE_ID}/ads.min.js`,
      async: true,
      strategy: "afterInteractive",
      attrs: { "data-no-optimize": "1", "data-cfasync": "false" },
    },
  ],
  getSlotSpec: () => ({ kind: "none" }),
};
