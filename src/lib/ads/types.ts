/**
 * Ad provider abstraction.
 *
 * Every ad network we support is described as an `AdProvider`: a plain,
 * server-safe config object that knows (a) which env vars configure it,
 * (b) what scripts to inject, and (c) how to render an inline slot.
 *
 * Important real-world constraint: most "full-site" managers (AdSense,
 * Mediavine, Raptive, Ezoic, Monumetric) cannot legally run on the same
 * page simultaneously. The registry enforces a single primary manager via
 * `NEXT_PUBLIC_AD_PRIMARY`; header-bidding (Prebid + TAM) is the only path
 * to running multiple demand sources at once.
 */

import type { AdEnv } from "./env";

export type { AdEnv };

/** Named placements used across the app. */
export type AdSlotName =
  | "feed-banner"
  | "feed-inline"
  | "sidebar"
  | "footer"
  | "sticky-bottom";

export type AdProviderKind =
  | "full-site" // takes over page-level ad placement; only one may be live
  | "header-bidding" // bids into a unified auction; composable
  | "contextual" // contextual display units
  | "native" // content-recommendation widgets
  | "direct"; // hand-placed / niche units

/** A `<script>` (or inline snippet) a provider needs in the document. */
export interface ScriptSpec {
  /** Stable id, used as the React key and to dedupe. */
  id: string;
  /** External script URL. Omit for inline-only snippets. */
  src?: string;
  /** Raw inline JS to run (used by providers that bootstrap via a global queue). */
  inlineHtml?: string;
  async?: boolean;
  crossOrigin?: "anonymous" | "use-credentials";
  /** next/script loading strategy. */
  strategy?: "beforeInteractive" | "afterInteractive" | "lazyOnload";
  /** Extra attributes (e.g. data-ad-client, data-cfasync). */
  attrs?: Record<string, string>;
}

/**
 * How an inline `<AdSlot>` should be rendered for this provider.
 * Most providers fall into one of these shapes; full-site managers that
 * auto-inject ads return `null` (no inline element needed).
 */
export type SlotSpec =
  | {
      /** Google-style `<ins class="adsbygoogle">` + a queue push on mount. */
      kind: "ins-push";
      className: string;
      style?: Record<string, string>;
      dataAttrs: Record<string, string>;
      /** Global queue to push an empty object onto after mount. */
      pushGlobal: string;
    }
  | {
      /** A `<div>` placeholder the provider's script fills (widgets, GPT, native). */
      kind: "div";
      id?: string;
      className?: string;
      dataAttrs?: Record<string, string>;
      /** Optional inline JS to execute on mount (e.g. googletag.display). */
      onMount?: string;
    }
  | { kind: "none" };

export interface AdProvider {
  id: string;
  name: string;
  kind: AdProviderKind;
  /** Human note shown in dev placeholder / docs. */
  note?: string;
  /** Env var names this provider reads (documentation + .env.example source). */
  envKeys: string[];
  /** True when the required env vars are present. */
  isConfigured: (env: AdEnv) => boolean;
  /** Scripts to inject when this provider is active. */
  getScripts: (env: AdEnv) => ScriptSpec[];
  /** How to render a given inline slot, or null if the provider auto-places ads. */
  getSlotSpec: (slot: AdSlotName, env: AdEnv) => SlotSpec | null;
}

/** Resolved, ready-to-render configuration for the current request. */
export interface ResolvedAdConfig {
  primary: AdProvider | null;
  /** Header-bidding + native/contextual/direct providers that compose with the primary. */
  secondary: AdProvider[];
  requireConsent: boolean;
}
