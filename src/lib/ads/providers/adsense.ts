import type { AdProvider, AdSlotName } from "../types";

/** Maps our placement names to the AdSense ad-unit slot id env vars. */
const SLOT_ENV: Record<AdSlotName, string> = {
  "feed-banner": "NEXT_PUBLIC_ADSENSE_SLOT_BANNER",
  "feed-inline": "NEXT_PUBLIC_ADSENSE_SLOT_INLINE",
  sidebar: "NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR",
  footer: "NEXT_PUBLIC_ADSENSE_SLOT_FOOTER",
  "sticky-bottom": "NEXT_PUBLIC_ADSENSE_SLOT_STICKY",
};

/** Google AdSense — the default starter network. */
export const adsense: AdProvider = {
  id: "adsense",
  name: "Google AdSense",
  kind: "full-site",
  note: "Auto/responsive display units. Requires a live, approved domain.",
  envKeys: [
    "NEXT_PUBLIC_ADSENSE_CLIENT",
    ...Object.values(SLOT_ENV),
  ],
  isConfigured: (env) => Boolean(env.NEXT_PUBLIC_ADSENSE_CLIENT),
  getScripts: (env) => [
    {
      id: "adsense-loader",
      src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${env.NEXT_PUBLIC_ADSENSE_CLIENT}`,
      async: true,
      crossOrigin: "anonymous",
      strategy: "afterInteractive",
    },
  ],
  getSlotSpec: (slot, env) => {
    const adSlot = env[SLOT_ENV[slot]];
    if (!adSlot) return null;
    return {
      kind: "ins-push",
      className: "adsbygoogle",
      style: { display: "block" },
      dataAttrs: {
        "data-ad-client": env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "",
        "data-ad-slot": adSlot,
        "data-ad-format": "auto",
        "data-full-width-responsive": "true",
      },
      pushGlobal: "adsbygoogle",
    };
  },
};
