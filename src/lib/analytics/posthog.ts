// Literal reads — required by Next.js for NEXT_PUBLIC_* inlining into the client bundle.
// Must not be aliased or dynamically indexed (see src/lib/ads/env.ts for the same pattern).
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
