import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: "X-Frame-Options",           value: "DENY" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // CI enforces typecheck before any push reaches Vercel,
  // so skipping it here avoids running tsc twice on every deploy.
  // (Next.js 16 no longer runs ESLint during build — that config key was removed.)
  typescript: { ignoreBuildErrors: true },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  env: {
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString(),
    NEXT_PUBLIC_BUILD_COMMIT: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    NEXT_PUBLIC_BUILD_NUMBER: readFileSync("build-number.txt", "utf8").trim(),
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  hideSourceMaps: true,
  disableLogger: true,
});
