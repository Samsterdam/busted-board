import type { AdProvider, AdSlotName } from "../types";

/** Maps placements to Outbrain widget id env vars (one widget per placement). */
const WIDGET_ENV: Partial<Record<AdSlotName, string>> = {
  "feed-inline": "NEXT_PUBLIC_OUTBRAIN_WIDGET_INLINE",
  footer: "NEXT_PUBLIC_OUTBRAIN_WIDGET_FOOTER",
};

/** Outbrain — content-recommendation native widgets. */
export const outbrain: AdProvider = {
  id: "outbrain",
  name: "Outbrain",
  kind: "native",
  note: "Native recommendation widgets (Smartfeed).",
  envKeys: ["NEXT_PUBLIC_OUTBRAIN_ENABLED", ...Object.values(WIDGET_ENV)],
  isConfigured: (env) => env.NEXT_PUBLIC_OUTBRAIN_ENABLED === "true",
  getScripts: () => [
    {
      id: "outbrain-loader",
      src: "https://widgets.outbrain.com/outbrain.js",
      async: true,
      strategy: "afterInteractive",
    },
  ],
  getSlotSpec: (slot, env) => {
    const widgetId = env[WIDGET_ENV[slot] ?? ""];
    if (!widgetId) return null;
    return {
      kind: "div",
      className: "OUTBRAIN",
      // data-src is filled with the canonical page URL by <AdSlot> on mount.
      dataAttrs: { "data-src": "", "data-widget-id": widgetId },
    };
  },
};
