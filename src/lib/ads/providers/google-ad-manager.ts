import type { AdProvider, AdSlotName } from "../types";

/** Ad unit path suffix + size per placement (under /<network>/<unit>). */
const UNIT: Record<AdSlotName, { unit: string; sizes: [number, number][] }> = {
  "feed-banner": { unit: "feed_banner", sizes: [[320, 50], [728, 90]] },
  "feed-inline": { unit: "feed_inline", sizes: [[300, 250]] },
  sidebar: { unit: "sidebar", sizes: [[300, 250], [300, 600]] },
  footer: { unit: "footer", sizes: [[728, 90], [320, 50]] },
  "sticky-bottom": { unit: "sticky", sizes: [[320, 50]] },
};

/**
 * Google Ad Manager (GPT / googletag). Defines slots up front in the loader
 * snippet, then each <AdSlot> calls googletag.display(divId) on mount.
 */
export const googleAdManager: AdProvider = {
  id: "gam",
  name: "Google Ad Manager (GPT)",
  kind: "full-site",
  note: "Direct-sold + AdX demand via GPT. Needs a GAM network code.",
  envKeys: ["NEXT_PUBLIC_GAM_NETWORK_CODE"],
  isConfigured: (env) => Boolean(env.NEXT_PUBLIC_GAM_NETWORK_CODE),
  getScripts: (env) => {
    const network = env.NEXT_PUBLIC_GAM_NETWORK_CODE ?? "";
    const defineSlots = (Object.keys(UNIT) as AdSlotName[])
      .map((slot) => {
        const { unit, sizes } = UNIT[slot];
        const sizeArr = JSON.stringify(sizes);
        return `googletag.defineSlot('/${network}/${unit}', ${sizeArr}, 'gam-${slot}')?.addService(googletag.pubads());`;
      })
      .join("\n      ");
    return [
      {
        id: "gpt-loader",
        src: "https://securepubads.g.doubleclick.net/tag/js/gpt.js",
        async: true,
        strategy: "afterInteractive",
      },
      {
        id: "gpt-define",
        strategy: "afterInteractive",
        inlineHtml: `window.googletag = window.googletag || {cmd: []};
    googletag.cmd.push(function () {
      ${defineSlots}
      googletag.pubads().enableSingleRequest();
      googletag.enableServices();
    });`,
      },
    ];
  },
  getSlotSpec: (slot) => ({
    kind: "div",
    id: `gam-${slot}`,
    onMount: `window.googletag = window.googletag || {cmd: []}; googletag.cmd.push(function(){ googletag.display('gam-${slot}'); });`,
  }),
};
