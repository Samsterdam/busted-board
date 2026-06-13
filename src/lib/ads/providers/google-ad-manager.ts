import type { AdProvider, AdSlotName } from "../types";
import {
  MOBILE_BANNER,
  LEADERBOARD,
  MED_RECTANGLE,
  HALF_PAGE,
  type AdSize,
} from "../../config/ads";

/** Ad unit path suffix + size per placement (under /<network>/<unit>). */
const UNIT: Record<AdSlotName, { unit: string; sizes: AdSize[] }> = {
  "feed-banner": { unit: "feed_banner", sizes: [MOBILE_BANNER, LEADERBOARD] },
  "feed-inline": { unit: "feed_inline", sizes: [MED_RECTANGLE] },
  sidebar: { unit: "sidebar", sizes: [MED_RECTANGLE, HALF_PAGE] },
  footer: { unit: "footer", sizes: [LEADERBOARD, MOBILE_BANNER] },
  "sticky-bottom": { unit: "sticky", sizes: [MOBILE_BANNER] },
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
