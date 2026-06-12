import type { AdProvider, AdSlotName, ResolvedAdConfig } from "./types";
import { AD_ENV, type AdEnv } from "./env";
import { requireConsent } from "./consent";

import { adsense } from "./providers/adsense";
import { googleAdManager } from "./providers/google-ad-manager";
import { ezoic } from "./providers/ezoic";
import { mediavine } from "./providers/mediavine";
import { raptive } from "./providers/raptive";
import { monumetric } from "./providers/monumetric";
import { prebid } from "./providers/prebid";
import { amazonTam } from "./providers/amazon-tam";
import { medianet } from "./providers/medianet";
import { taboola } from "./providers/taboola";
import { outbrain } from "./providers/outbrain";
import { carbon } from "./providers/carbon";
import { buysellads } from "./providers/buysellads";

/** Every provider we know how to render, keyed by id. */
export const ALL_PROVIDERS: Record<string, AdProvider> = {
  adsense,
  gam: googleAdManager,
  ezoic,
  mediavine,
  raptive,
  monumetric,
  prebid,
  "amazon-tam": amazonTam,
  medianet,
  taboola,
  outbrain,
  carbon,
  buysellads,
};

/**
 * Full-site managers are mutually exclusive — only the one named by
 * NEXT_PUBLIC_AD_PRIMARY may go live. Everything else (header bidding,
 * native, contextual, direct) composes freely on top.
 */
const FULL_SITE_IDS = new Set(
  Object.values(ALL_PROVIDERS)
    .filter((p) => p.kind === "full-site")
    .map((p) => p.id),
);

/**
 * Resolve the active ad configuration from environment variables.
 *
 * - `NEXT_PUBLIC_AD_PRIMARY` picks the single primary manager (default "adsense").
 *   Set it to "none" to run header-bidding/native only, or "off" to disable ads.
 * - Any configured non-full-site provider is added as a composable secondary.
 */
export function resolveAdConfig(env: AdEnv = AD_ENV): ResolvedAdConfig {
  const primaryId = (env.NEXT_PUBLIC_AD_PRIMARY ?? "adsense").toLowerCase();

  if (primaryId === "off") {
    return { primary: null, secondary: [], requireConsent: requireConsent(env) };
  }

  let primary: AdProvider | null = null;
  if (primaryId !== "none") {
    const candidate = ALL_PROVIDERS[primaryId];
    if (candidate && FULL_SITE_IDS.has(candidate.id) && candidate.isConfigured(env)) {
      primary = candidate;
    }
  }

  const secondary = Object.values(ALL_PROVIDERS).filter(
    (p) => !FULL_SITE_IDS.has(p.id) && p.isConfigured(env),
  );

  return { primary, secondary, requireConsent: requireConsent(env) };
}

/** Providers that should be active this request (primary first). */
export function activeProviders(env: AdEnv = AD_ENV): AdProvider[] {
  const { primary, secondary } = resolveAdConfig(env);
  return primary ? [primary, ...secondary] : secondary;
}

/**
 * Whether any active provider actually renders into the given slot. Lets the UI
 * skip reserving ad space entirely when ads are off, so the layout shows normal
 * content instead of an empty band.
 */
export function slotHasActiveProvider(name: AdSlotName, env: AdEnv = AD_ENV): boolean {
  return activeProviders(env).some((p) => {
    const spec = p.getSlotSpec(name, env);
    return spec != null && spec.kind !== "none";
  });
}
