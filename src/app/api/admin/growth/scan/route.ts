import { env } from "@/lib/env";
import { runScanner } from "@/lib/growth/scanner";

export async function POST(request: Request) {
  const auth = request.headers.get("Authorization");
  const expected = env.GROWTH_ADMIN_SECRET
    ? `Bearer ${env.GROWTH_ADMIN_SECRET}`
    : null;

  if (expected && auth !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.REDDIT_CLIENT_ID) {
    return Response.json({ error: "Reddit credentials not configured" }, { status: 503 });
  }

  try {
    const result = await runScanner();
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
