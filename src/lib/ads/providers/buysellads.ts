import type { AdProvider, AdSlotName } from "../types";

/** Maps placements to BuySellAds zone-id env vars. */
const ZONE_ENV: Partial<Record<AdSlotName, string>> = {
  sidebar: "NEXT_PUBLIC_BSA_ZONE_SIDEBAR",
  "feed-inline": "NEXT_PUBLIC_BSA_ZONE_INLINE",
};

/** BuySellAds — direct-sold / sponsorship marketplace units. */
export const buysellads: AdProvider = {
  id: "buysellads",
  name: "BuySellAds",
  kind: "direct",
  note: "Direct-sold sponsorship units via the BSA serving library.",
  envKeys: ["NEXT_PUBLIC_BSA_ENABLED", ...Object.values(ZONE_ENV)],
  isConfigured: (env) => env.NEXT_PUBLIC_BSA_ENABLED === "true",
  getScripts: () => [
    {
      id: "bsa-loader",
      src: "https://m.servedby-buysellads.com/monetization.js",
      async: true,
      strategy: "afterInteractive",
    },
    {
      id: "bsa-init",
      strategy: "afterInteractive",
      inlineHtml: `window._bsa = window._bsa || {}; if (typeof _bsa.init === 'function') { _bsa.init('default', '', 'placement:default'); }`,
    },
  ],
  getSlotSpec: (slot, env) => {
    const zone = env[ZONE_ENV[slot] ?? ""];
    if (!zone) return null;
    return {
      kind: "div",
      className: "bsa-cpc",
      id: `bsa-${slot}`,
      dataAttrs: { "data-zone-id": zone },
    };
  },
};
