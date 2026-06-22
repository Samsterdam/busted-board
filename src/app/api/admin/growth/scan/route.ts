import { auth as getSession } from "@/auth";
import { env } from "@/lib/env";
import { runScanner } from "@/lib/growth/scanner";

async function isAuthorized(request: Request): Promise<boolean> {
  const authHeader = request.headers.get("Authorization");
  const expected = env.GROWTH_ADMIN_SECRET ? `Bearer ${env.GROWTH_ADMIN_SECRET}` : null;
  if (expected && authHeader === expected) return true;

  const session = await getSession();
  if (!session?.user?.email) return false;
  if (env.ADMIN_EMAIL && session.user.email !== env.ADMIN_EMAIL) return false;
  return true;
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runScanner();
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
