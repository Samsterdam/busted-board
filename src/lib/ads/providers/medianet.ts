import type { AdProvider, AdSlotName } from "../types";

const SLOT_ENV: Record<AdSlotName, string> = {
  "feed-banner": "NEXT_PUBLIC_MEDIANET_CRID_BANNER",
  "feed-inline": "NEXT_PUBLIC_MEDIANET_CRID_INLINE",
  sidebar: "NEXT_PUBLIC_MEDIANET_CRID_SIDEBAR",
  footer: "NEXT_PUBLIC_MEDIANET_CRID_FOOTER",
  "sticky-bottom": "NEXT_PUBLIC_MEDIANET_CRID_STICKY",
};

/** Media.net — Yahoo/Bing contextual display network. */
export const medianet: AdProvider = {
  id: "medianet",
  name: "Media.net",
  kind: "contextual",
  note: "Contextual display. Each unit needs its own CRID from the dashboard.",
  envKeys: ["NEXT_PUBLIC_MEDIANET_CID", ...Object.values(SLOT_ENV)],
  isConfigured: (env) => Boolean(env.NEXT_PUBLIC_MEDIANET_CID),
  getScripts: (env) => [
    {
      id: "medianet-init",
      strategy: "afterInteractive",
      inlineHtml: `window._mNHandle = window._mNHandle || {};
    window._mNHandle.queue = window._mNHandle.queue || [];
    window.medianet_versionId = "3121199";`,
    },
    {
      id: "medianet-loader",
      src: `https://contextual.media.net/dmedianet.js?cid=${env.NEXT_PUBLIC_MEDIANET_CID}`,
      async: true,
      strategy: "afterInteractive",
    },
  ],
  getSlotSpec: (slot, env) => {
    const crid = env[SLOT_ENV[slot]];
    if (!crid) return null;
    return {
      kind: "div",
      id: `mn-${slot}`,
      onMount: `window._mNHandle = window._mNHandle || {}; window._mNHandle.queue = window._mNHandle.queue || []; window._mNHandle.queue.push(function () { window._mNDetails.loadTag("mn-${slot}", "300x250", "${crid}"); });`,
    };
  },
};
