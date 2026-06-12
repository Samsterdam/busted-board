"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { activeProviders } from "@/lib/ads/registry";
import { AD_ENV } from "@/lib/ads/env";
import type { AdProvider, AdSlotName, SlotSpec } from "@/lib/ads/types";
import { adsAllowed } from "@/lib/ads/consent";

interface Props {
  name: AdSlotName;
  className?: string;
}

/** Pick the first active provider that actually renders into this placement. */
function resolveSlot(
  name: AdSlotName,
): { provider: AdProvider; spec: SlotSpec } | null {
  for (const provider of activeProviders()) {
    const spec = provider.getSlotSpec(name, AD_ENV);
    if (spec && spec.kind !== "none") return { provider, spec };
  }
  return null;
}

/** camelCase a CSS prop record into a React style object. */
function toStyle(style?: Record<string, string>): CSSProperties | undefined {
  return style as CSSProperties | undefined;
}

/**
 * Unified ad placement. Renders whichever active provider owns this slot,
 * or a labeled placeholder in development so layouts can be designed without
 * live ads. Renders nothing if consent is required and not yet granted.
 */
export function AdSlot({ name, className = "" }: Props) {
  const ref = useRef<HTMLDivElement | HTMLModElement | null>(null);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(adsAllowed());
    const onChange = () => setAllowed(adsAllowed());
    window.addEventListener("bb-consent-change", onChange);
    return () => window.removeEventListener("bb-consent-change", onChange);
  }, []);

  const resolved = resolveSlot(name);

  useEffect(() => {
    if (!allowed || !resolved) return;
    const { spec } = resolved;
    try {
      if (spec.kind === "ins-push") {
        const w = window as unknown as Record<string, unknown[]>;
        w[spec.pushGlobal] = w[spec.pushGlobal] || [];
        w[spec.pushGlobal].push({});
      } else if (spec.kind === "div") {
        // Fill Outbrain's data-src with the live page URL.
        const el = ref.current;
        if (el && el.getAttribute("data-src") === "") {
          el.setAttribute("data-src", window.location.href);
        }
        // Trusted, provider-authored bootstrap string (not user input).
        if (spec.onMount) new Function(spec.onMount)();
      }
    } catch {
      // Network script not ready (e.g. dev / blocked); slot stays empty.
    }
    // Re-run if the resolved provider changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, name]);

  // Dev placeholder so layout is visible while building out ad slots — but only
  // when a provider actually owns this slot. With ads off/unconfigured we render
  // nothing, so the app looks exactly as it will in production.
  if (process.env.NODE_ENV === "development" && resolved) {
    return (
      <div
        className={`flex min-h-[50px] items-center justify-center rounded border border-dashed border-border bg-secondary text-xs text-muted-foreground ${className}`}
        role="presentation"
        aria-hidden="true"
      >
        Ad slot · {name} · {resolved.provider.name}
      </div>
    );
  }

  if (!allowed || !resolved) return null;

  const { spec } = resolved;

  if (spec.kind === "ins-push") {
    return (
      <div className={className}>
        <ins
          ref={ref as React.Ref<HTMLModElement>}
          className={spec.className}
          style={toStyle(spec.style)}
          {...spec.dataAttrs}
        />
      </div>
    );
  }

  if (spec.kind !== "div") return null;

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      id={spec.id}
      className={`${spec.className ?? ""} ${className}`.trim()}
      {...(spec.dataAttrs ?? {})}
    />
  );
}
