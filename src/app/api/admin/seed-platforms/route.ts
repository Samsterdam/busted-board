import { auth } from "@/auth";
import { env } from "@/lib/env";
import { seedPlatforms } from "@/lib/media-store";

// Seeds the curated PLATFORM_REGISTRY into the platforms table. Idempotent and
// optional (platforms self-populate from availability traffic), but handy to
// pre-fill known names/types. Writes to the DB, so it is gated to the admin
// account only — same guard pattern as the other /api/admin/* routes.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (env.ADMIN_EMAIL && session.user.email !== env.ADMIN_EMAIL) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const count = await seedPlatforms();
  return Response.json({ seeded: count });
}
