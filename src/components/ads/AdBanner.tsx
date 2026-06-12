"use client";

import { useEffect, useRef } from "react";

interface Props {
  className?: string;
}

export function AdBanner({ className = "" }: Props) {
  const ref = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (ref.current && typeof window !== "undefined" && "adsbygoogle" in window) {
      try {
        // @ts-expect-error adsbygoogle injected by AdSense script
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // AdSense not loaded yet (dev mode)
      }
    }
  }, []);

  // In dev mode, show a placeholder so layout is designed correctly
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    return (
      <div
        className={`flex h-[50px] items-center justify-center rounded border border-dashed border-border bg-secondary text-xs text-muted-foreground ${className}`}
        role="presentation"
        aria-hidden="true"
      >
        Ad slot (320×50)
      </div>
    );
  }

  return (
    <div className={className}>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT}
        data-ad-slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
