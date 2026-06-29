import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getMovieCollection } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tmdbId = parseInt(new URL(request.url).searchParams.get("tmdbId") ?? "");
  if (!tmdbId) return Response.json({ error: "Missing or invalid tmdbId" }, { status: 400 });

  try {
    const collection = await getMovieCollection(tmdbId);
    return Response.json({ collection });
  } catch {
    return Response.json({ collection: null });
  }
}
