"use client";

import Script from "next/script";
import { activeProviders } from "@/lib/ads/registry";
import { AD_ENV } from "@/lib/ads/env";
import { useAdsAllowed } from "@/lib/ads/use-ads-consent";

/**
 * Injects the loader/init scripts for every active ad provider, once, at the
 * document level. Mount this once in the root layout. Respects the consent
 * gate: nothing loads until ads are allowed.
 */
export function AdScripts() {
  const allowed = useAdsAllowed();

  if (!allowed) return null;

  const scripts = activeProviders().flatMap((p) => p.getScripts(AD_ENV));

  return (
    <>
      {scripts.map((s) =>
        s.src ? (
          <Script
            key={s.id}
            id={s.id}
            src={s.src}
            async={s.async}
            crossOrigin={s.crossOrigin}
            strategy={s.strategy ?? "afterInteractive"}
            {...s.attrs}
          />
        ) : (
          <Script
            key={s.id}
            id={s.id}
            strategy={s.strategy ?? "afterInteractive"}
            dangerouslySetInnerHTML={{ __html: s.inlineHtml ?? "" }}
          />
        ),
      )}
    </>
  );
}
