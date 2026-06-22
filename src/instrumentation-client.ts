import posthog from "posthog-js";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: "https://app.posthog.com",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,
  });
}

export function onRouterTransitionStart(url: string) {
  if (POSTHOG_KEY) posthog.capture("$pageview", { $current_url: url });
}
