import type { AdProvider } from "../types";

/**
 * Mediavine. Full-service manager for established content sites
 * (~50k sessions/mo threshold). One script tag; Mediavine auto-injects
 * units, so inline slots resolve to "none".
 */
export const mediavine: AdProvider = {
  id: "mediavine",
  name: "Mediavine",
  kind: "full-site",
  note: "Premium full-service. Auto-places ads; no inline slot markup needed.",
  envKeys: ["NEXT_PUBLIC_MEDIAVINE_SITE_ID"],
  isConfigured: (env) => Boolean(env.NEXT_PUBLIC_MEDIAVINE_SITE_ID),
  getScripts: (env) => [
    {
      id: "mediavine-script",
      src: `https://scripts.mediavine.com/tags/${env.NEXT_PUBLIC_MEDIAVINE_SITE_ID}.js`,
      async: true,
      strategy: "afterInteractive",
      attrs: { "data-noptimize": "1", "data-cfasync": "false" },
    },
  ],
  getSlotSpec: () => ({ kind: "none" }),
};
