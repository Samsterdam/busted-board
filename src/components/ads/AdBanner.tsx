"use client";

import { AdSlot } from "./AdSlot";

interface Props {
  className?: string;
}

/**
 * Back-compat wrapper. The in-feed banner is now just the "feed-banner"
 * placement of the unified <AdSlot>, which dispatches to whichever ad
 * provider is configured (see src/lib/ads).
 */
export function AdBanner({ className = "" }: Props) {
  return <AdSlot name="feed-banner" className={className} />;
}
