/**
 * Minimal consent gate.
 *
 * This is NOT a certified IAB TCF CMP. It is a lightweight, self-hosted
 * consent record so ad scripts don't load before the user agrees. For EU
 * traffic at scale you'll want a real CMP (e.g. Google's, Quantcast Choice,
 * Cookiebot) — wire it in by replacing `hasConsent()` with the CMP's signal.
 */

import { AD_ENV, type AdEnv } from "./env";

export const CONSENT_COOKIE = "bb_ad_consent";
export type ConsentValue = "granted" | "denied";

/** Whether the build requires consent before loading ad scripts. */
export function requireConsent(env: AdEnv = AD_ENV): boolean {
  return env.NEXT_PUBLIC_AD_REQUIRE_CONSENT === "true";
}

/** Read consent from document.cookie (client only). Returns null if undecided. */
export function readConsent(): ConsentValue | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) return null;
  const value = match.split("=")[1];
  return value === "granted" || value === "denied" ? value : null;
}

/** Persist a consent decision for ~1 year. */
export function writeConsent(value: ConsentValue): void {
  if (typeof document === "undefined") return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${oneYear}; samesite=lax`;
}

/**
 * Should ad scripts load right now?
 * - If consent isn't required, always true.
 * - Otherwise, only once the user has explicitly granted.
 */
export function adsAllowed(env: AdEnv = AD_ENV): boolean {
  if (!requireConsent(env)) return true;
  return readConsent() === "granted";
}
