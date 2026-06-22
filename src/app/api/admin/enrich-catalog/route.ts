import { auth } from "@/auth";
import { env } from "@/lib/env";
import { enrichCatalogData } from "@/lib/catalog-poster-warmup";
import { CATALOG_ENRICH_ROWS_PER_CALL } from "@/lib/config/catalog";

export async function POST(request: Request) {
  const secret = request.headers.get("x-sync-secret");
  const secretValid = env.CATALOG_SYNC_SECRET && secret === env.CATALOG_SYNC_SECRET;

  if (!secretValid) {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (env.ADMIN_EMAIL && session.user.email !== env.ADMIN_EMAIL) return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { enriched, remaining } = await enrichCatalogData(CATALOG_ENRICH_ROWS_PER_CALL);
  return Response.json({ enriched, remaining });
}
