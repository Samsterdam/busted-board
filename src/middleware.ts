import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  RATE_LIMIT_TASTE_PROFILE_RPH,
  RATE_LIMIT_FEED_RPH,
  RATE_LIMIT_GENERAL_RPH,
} from "@/lib/config/rate-limits";
import { MS_PER_SECOND } from "@/lib/config/durations";

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
    }
  : null;

function pickLimiter(req: NextRequest) {
  if (!limiters) return null;
  const { pathname } = req.nextUrl;
  if (pathname === "/api/taste-profile/analyze" && req.method === "POST")
    return { limiter: limiters.tasteProfile, key: `taste` };
  if (pathname === "/api/recommendations/feed" && req.method === "GET")
    return { limiter: limiters.feed, key: `feed` };
  if (pathname.startsWith("/api/"))
    return { limiter: limiters.general, key: `general` };
  return null;
}

async function checkRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const picked = pickLimiter(req);
  if (!picked) return null;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const { success, reset } = await picked.limiter.limit(`${picked.key}:${ip}`);

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
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  if (!isPublic) {
    const limited = await checkRateLimit(req);
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
