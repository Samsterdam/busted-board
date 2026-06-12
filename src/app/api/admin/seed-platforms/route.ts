import { auth } from "@/auth";
import { seedPlatforms } from "@/lib/media-store";

// Seeds the curated PLATFORM_REGISTRY into the platforms table. Idempotent and
// optional (platforms self-populate from availability traffic), but handy to
// pre-fill known names/types. Writes to the DB, so unlike the read-only
// seed-movies route this is gated behind auth. There is no admin role in the
// schema yet, so any authenticated user may run it; the action is idempotent
// and low-harm.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await seedPlatforms();
  return Response.json({ seeded: count });
}
