"use client";

import { useState, useEffect } from "react";
import type { FeedItem } from "@/lib/recommendation-engine";

export function useDiscovery(feedLength: number, loading: boolean) {
  const [discovery, setDiscovery] = useState<FeedItem[]>([]);
  const [loadingDiscovery, setLoadingDiscovery] = useState(false);

  useEffect(() => {
    if (feedLength === 0 || loading) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingDiscovery(true);
    fetch("/api/recommendations/discovery")
      .then((r) => r.json())
      .then((data) => setDiscovery(data.discovery ?? []))
      .catch(() => null)
      .finally(() => setLoadingDiscovery(false));
  // feedLength as dep: fires once after feed first populates, not on every mutation.
  }, [feedLength, loading]);

  return { discovery, setDiscovery, loadingDiscovery };
}
