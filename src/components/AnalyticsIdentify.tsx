"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export function AnalyticsIdentify({ userId }: { userId: string }) {
  useEffect(() => {
    posthog.identify(userId);
  }, [userId]);
  return null;
}
