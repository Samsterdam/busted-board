import type { AdProvider, AdSlotName } from "../types";

/** Maps placements to Taboola "mode" + "container" placement names. */
const PLACEMENT: Partial<Record<AdSlotName, { mode: string; placement: string }>> = {
  "feed-inline": { mode: "thumbnails-a", placement: "Below Article Thumbnails" },
  footer: { mode: "thumbnails-feed-a", placement: "Mid Article Thumbnails" },
};

/** Taboola — content-recommendation native widgets. */
export const taboola: AdProvider = {
  id: "taboola",
  name: "Taboola",
  kind: "native",
  note: "Native 'around the web' recommendation widgets.",
  envKeys: ["NEXT_PUBLIC_TABOOLA_PUBLISHER"],
  isConfigured: (env) => Boolean(env.NEXT_PUBLIC_TABOOLA_PUBLISHER),
  getScripts: (env) => [
    {
      id: "taboola-loader",
      src: `https://cdn.taboola.com/libtrc/${env.NEXT_PUBLIC_TABOOLA_PUBLISHER}/loader.js`,
      async: true,
      strategy: "afterInteractive",
    },
    {
      id: "taboola-init",
      strategy: "afterInteractive",
      inlineHtml: `window._taboola = window._taboola || []; _taboola.push({ article: "auto" });`,
    },
  ],
  getSlotSpec: (slot) => {
    const cfg = PLACEMENT[slot];
    if (!cfg) return null;
    return {
      kind: "div",
      id: `taboola-${slot}`,
      onMount: `window._taboola = window._taboola || []; _taboola.push({ mode: "${cfg.mode}", container: "taboola-${slot}", placement: "${cfg.placement}", target_type: "mix" });`,
    };
  },
};
