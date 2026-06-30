import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";
import { KEEPALIVE_TTL_S } from "@/lib/config/durations";

// Keep-alive endpoint. Vercel Cron hits this on a schedule; the Redis touch
// below is what keeps the free-tier Upstash database from being archived for
// inactivity. Also doubles as a basic health check.
//
// Auth: Vercel Cron automatically sends `Authorization: Bearer ${CRON_SECRET}`.
// When CRON_SECRET is unset (e.g. local dev) the route stays open but simply
// reports that Redis isn't configured.
export const dynamic = "force-dynamic";

const PING_KEY = "keepalive:ping";

function isAuthorized(request: Request): boolean {
  if (!env.CRON_SECRET) return true; // no secret configured → don't gate (local/dev)
  return request.headers.get("Authorization") === `Bearer ${env.CRON_SECRET}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return Response.json({ ok: true, redis: "not-configured" });
  }

  try {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    const stamp = new Date().toISOString();
    await redis.set(PING_KEY, stamp, { ex: KEEPALIVE_TTL_S });
    const readBack = await redis.get<string>(PING_KEY);
    return Response.json({ ok: true, redis: "ok", pingedAt: readBack ?? stamp });
  } catch (err) {
    return Response.json({ ok: false, redis: "error", error: String(err) }, { status: 500 });
  }
}
