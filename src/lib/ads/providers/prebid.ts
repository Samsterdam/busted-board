import type { AdProvider } from "../types";
import type { AdEnv } from "../env";

/**
 * Prebid.js header-bidding wrapper. This is the legitimate way to run many
 * demand partners at once: each bidder competes in a client-side auction,
 * the winner is passed to the ad server (GAM) as targeting.
 *
 * Bidders are enabled individually via env. Their params are placeholders —
 * fill them from each SSP's onboarding. The build here keeps the wrapper
 * lean; production setups usually self-host a Prebid build with only the
 * adapters they use.
 */

interface Bidder {
  env: string; // primary id env var that toggles the bidder on
  build: (env: AdEnv) => string; // JS literal for the bid object
}

const BIDDERS: Bidder[] = [
  {
    env: "NEXT_PUBLIC_PREBID_IX_SITE_ID",
    build: (e) =>
      `{ bidder: 'ix', params: { siteId: '${e.NEXT_PUBLIC_PREBID_IX_SITE_ID}' } }`,
  },
  {
    env: "NEXT_PUBLIC_PREBID_OPENX_UNIT",
    build: (e) =>
      `{ bidder: 'openx', params: { unit: '${e.NEXT_PUBLIC_PREBID_OPENX_UNIT}', delDomain: '${e.NEXT_PUBLIC_PREBID_OPENX_DELDOMAIN ?? ""}' } }`,
  },
  {
    env: "NEXT_PUBLIC_PREBID_PUBMATIC_PUBID",
    build: (e) =>
      `{ bidder: 'pubmatic', params: { publisherId: '${e.NEXT_PUBLIC_PREBID_PUBMATIC_PUBID}', adSlot: '${e.NEXT_PUBLIC_PREBID_PUBMATIC_ADSLOT ?? ""}' } }`,
  },
  {
    env: "NEXT_PUBLIC_PREBID_CRITEO_NETWORK",
    build: (e) =>
      `{ bidder: 'criteo', params: { networkId: ${e.NEXT_PUBLIC_PREBID_CRITEO_NETWORK} } }`,
  },
  {
    env: "NEXT_PUBLIC_PREBID_SOVRN_TAGID",
    build: (e) =>
      `{ bidder: 'sovrn', params: { tagid: '${e.NEXT_PUBLIC_PREBID_SOVRN_TAGID}' } }`,
  },
];

function activeBidders(env: AdEnv): string[] {
  return BIDDERS.filter((b) => env[b.env]).map((b) => b.build(env));
}

export const prebid: AdProvider = {
  id: "prebid",
  name: "Prebid.js (header bidding)",
  kind: "header-bidding",
  note: "Unified auction across Index Exchange, OpenX, PubMatic, Criteo, Sovrn. Renders through GAM.",
  envKeys: [
    "NEXT_PUBLIC_PREBID_ENABLED",
    "NEXT_PUBLIC_PREBID_IX_SITE_ID",
    "NEXT_PUBLIC_PREBID_OPENX_UNIT",
    "NEXT_PUBLIC_PREBID_OPENX_DELDOMAIN",
    "NEXT_PUBLIC_PREBID_PUBMATIC_PUBID",
    "NEXT_PUBLIC_PREBID_PUBMATIC_ADSLOT",
    "NEXT_PUBLIC_PREBID_CRITEO_NETWORK",
    "NEXT_PUBLIC_PREBID_SOVRN_TAGID",
  ],
  isConfigured: (env) =>
    env.NEXT_PUBLIC_PREBID_ENABLED === "true" && activeBidders(env).length > 0,
  getScripts: (env) => {
    const bids = activeBidders(env).join(",\n          ");
    return [
      {
        id: "prebid-loader",
        // Self-host a custom Prebid build in production; the CDN copy is for bring-up.
        src: "https://cdn.jsdelivr.net/npm/prebid.js@latest/dist/not-for-prod/prebid.js",
        async: true,
        strategy: "afterInteractive",
      },
      {
        id: "prebid-config",
        strategy: "afterInteractive",
        inlineHtml: `window.pbjs = window.pbjs || {}; window.pbjs.que = window.pbjs.que || [];
    window.__BB_PREBID_BIDS__ = [
          ${bids}
    ];
    pbjs.que.push(function () {
      pbjs.setConfig({ priceGranularity: 'high', userSync: { syncEnabled: true } });
    });`,
      },
    ];
  },
  // Prebid renders into GAM slots; it doesn't place its own inline element.
  getSlotSpec: () => ({ kind: "none" }),
};
