import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  RATE_LIMIT_TASTE_PROFILE_RPH,
  RATE_LIMIT_FEED_RPH,
  RATE_LIMIT_GENERAL_RPH,
  RATE_LIMIT_PUBLIC_RPH,
  ROUTE_TASTE_PROFILE_ANALYZE,
  ROUTE_RECOMMENDATIONS_FEED,
} from "@/lib/config/rate-limits";
import { isProduction } from "@/lib/env";
const MS_PER_SECOND = 1_000;

// Edge-safe instance: built from authConfig WITHOUT the Drizzle adapter, so
// the DB driver never enters the edge bundle. JWT verification only.
const { auth } = NextAuth(authConfig);

// Upstash Redis — only initialised when env vars are present so local dev
// without an Upstash account works without changes (rate limiting is skipped).
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const limiters = redis
  ? {
      tasteProfile: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(RATE_LIMIT_TASTE_PROFILE_RPH, "1 h") }),
      feed:         new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(RATE_LIMIT_FEED_RPH, "1 h") }),
      general:      new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(RATE_LIMIT_GENERAL_RPH, "1 h") }),
      public:       new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(RATE_LIMIT_PUBLIC_RPH, "1 h") }),
    }
  : null;

/**
 * Trusted client IP. `x-forwarded-for` is a client-settable header whose
 * LEFTMOST entry is attacker-controlled — keying a limiter on it lets an
 * attacker rotate the value and get a fresh bucket per request. Vercel sets
 * `x-real-ip` to the real edge-observed client IP, so prefer that; fall back to
 * the LAST `x-forwarded-for` hop (closest to our trusted proxy), then to a
 * shared "anonymous" bucket.
 */
function clientIp(req: NextRequest): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((h) => h.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }
  return "anonymous";
}

/**
 * Selects the limiter bucket for an `/api/*` request. `isPublicApi` is true for
 * anonymous-reachable API routes (no auth required) so they get the tighter
 * public bucket instead of falling through to the authed general floor.
 * Returns null for non-API paths (pages aren't rate limited).
 */
function pickLimiter(req: NextRequest, isPublicApi: boolean) {
  if (!limiters) return null;
  const { pathname } = req.nextUrl;
  if (pathname === ROUTE_TASTE_PROFILE_ANALYZE && req.method === "POST")
    return { limiter: limiters.tasteProfile, key: `taste` };
  if (pathname === ROUTE_RECOMMENDATIONS_FEED && req.method === "GET")
    return { limiter: limiters.feed, key: `feed` };
  if (pathname.startsWith("/api/"))
    return isPublicApi
      ? { limiter: limiters.public, key: `public` }
      : { limiter: limiters.general, key: `general` };
  return null;
}

async function checkRateLimit(req: NextRequest, isPublicApi: boolean): Promise<NextResponse | null> {
  // Fail CLOSED in production: if the limiter isn't configured, an /api/* route
  // would otherwise run uncapped (Gemini bill risk on the expensive routes,
  // spam/DB-write risk on the general/public buckets). Locally we still skip,
  // so dev needs no Upstash account.
  if (!limiters) {
    if (isProduction && req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Rate limiting unavailable" }, { status: 503 });
    }
    return null;
  }

  const picked = pickLimiter(req, isPublicApi);
  if (!picked) return null;

  const { success, reset } = await picked.limiter.limit(`${picked.key}:${clientIp(req)}`);

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((reset - Date.now()) / MS_PER_SECOND)) } }
    );
  }
  return null;
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/browse" ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname.startsWith("/top/") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/health" ||
    pathname.startsWith("/api/recommendations/public/") ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  // Rate limit every /api/* request — including public ones, which are the
  // first surface an anonymous bot or cold-link crowd hits. Public API routes
  // get the tighter public bucket; pages are never rate limited.
  const isApi = pathname.startsWith("/api/");
  const isPublicApi = isApi && isPublic;
  if (isApi && !pathname.startsWith("/api/auth")) {
    const limited = await checkRateLimit(req, isPublicApi);
    if (limited) return limited;
  }

  const isLoggedIn = !!req.auth;

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json).*)"],
};
