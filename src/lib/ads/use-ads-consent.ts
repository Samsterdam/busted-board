import { useSyncExternalStore } from "react";
import { adsAllowed, readConsent, requireConsent } from "./consent";

// Consent lives outside React (a cookie + a `bb-consent-change` window event
// dispatched by the banner). useSyncExternalStore is the React-blessed way to
// read it: SSR-safe (server snapshot is always false, so nothing ad-related
// renders during SSR/hydration) and re-renders on the consent-change event —
// without a synchronous setState-in-effect.

const CONSENT_EVENT = "bb-consent-change";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CONSENT_EVENT, onChange);
  return () => window.removeEventListener(CONSENT_EVENT, onChange);
}

/** Whether ad scripts/slots may load right now. `false` during SSR/hydration. */
export function useAdsAllowed(): boolean {
  return useSyncExternalStore(subscribe, adsAllowed, () => false);
}

/** Whether the consent banner should show (consent required and not yet decided). */
export function useNeedsConsent(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => requireConsent() && readConsent() === null,
    () => false,
  );
}
