import type { AdProvider, AdSlotName } from "../types";

/** Maps placements to Ezoic placeholder ids (created in the Ezoic dashboard). */
const PLACEHOLDER: Record<AdSlotName, string> = {
  "feed-banner": "NEXT_PUBLIC_EZOIC_PH_BANNER",
  "feed-inline": "NEXT_PUBLIC_EZOIC_PH_INLINE",
  sidebar: "NEXT_PUBLIC_EZOIC_PH_SIDEBAR",
  footer: "NEXT_PUBLIC_EZOIC_PH_FOOTER",
  "sticky-bottom": "NEXT_PUBLIC_EZOIC_PH_STICKY",
};

/**
 * Ezoic (standalone JS integration). Auto-optimizes placements; each inline
 * slot is an Ezoic placeholder div shown via ezstandalone.showAds().
 */
export const ezoic: AdProvider = {
  id: "ezoic",
  name: "Ezoic",
  kind: "full-site",
  note: "AI placement optimization. Standalone integration via ezstandalone.",
  envKeys: ["NEXT_PUBLIC_EZOIC_ENABLED", ...Object.values(PLACEHOLDER)],
  isConfigured: (env) => env.NEXT_PUBLIC_EZOIC_ENABLED === "true",
  getScripts: () => [
    {
      id: "ezoic-sa",
      src: "https://www.ezojs.com/ezoic/sa.min.js",
      async: true,
      strategy: "afterInteractive",
    },
    {
      id: "ezoic-init",
      strategy: "afterInteractive",
      inlineHtml: `window.ezstandalone = window.ezstandalone || {}; ezstandalone.cmd = ezstandalone.cmd || [];`,
    },
  ],
  getSlotSpec: (slot, env) => {
    const id = env[PLACEHOLDER[slot]];
    if (!id) return null;
    return {
      kind: "div",
      id: `ezoic-pub-ad-placeholder-${id}`,
      onMount: `window.ezstandalone = window.ezstandalone || {}; ezstandalone.cmd = ezstandalone.cmd || []; ezstandalone.cmd.push(function () { ezstandalone.showAds(${id}); });`,
    };
  },
};
