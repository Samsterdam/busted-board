"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { POSTHOG_KEY, POSTHOG_HOST } from "@/lib/analytics/posthog";

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!pathname) return;
    const qs = searchParams.toString();
    const url = window.origin + pathname + (qs ? "?" + qs : "");
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);
  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!POSTHOG_KEY) return;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
    });
  }, []);
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
