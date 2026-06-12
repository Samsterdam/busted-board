import type { AdProvider } from "../types";

/**
 * Monumetric. Full-service manager (lower traffic threshold than
 * Mediavine/Raptive). Loads a per-publisher init script; ads are placed
 * via the dashboard, so inline slots resolve to "none".
 */
export const monumetric: AdProvider = {
  id: "monumetric",
  name: "Monumetric",
  kind: "full-site",
  note: "Full-service for growing sites. Placement configured in dashboard.",
  envKeys: ["NEXT_PUBLIC_MONUMETRIC_SITE_ID", "NEXT_PUBLIC_MONUMETRIC_PROPERTY"],
  isConfigured: (env) => Boolean(env.NEXT_PUBLIC_MONUMETRIC_SITE_ID),
  getScripts: (env) => [
    {
      id: "monumetric-script",
      src: `https://services.monumetric.com/p/setup/${env.NEXT_PUBLIC_MONUMETRIC_SITE_ID}/${env.NEXT_PUBLIC_MONUMETRIC_PROPERTY ?? "default"}.js`,
      async: true,
      strategy: "afterInteractive",
    },
  ],
  getSlotSpec: () => ({ kind: "none" }),
};
