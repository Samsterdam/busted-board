import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { searchMulti } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q");
  if (!q) return Response.json({ results: [] });

  try {
    const data = await searchMulti(q);
    return Response.json({ results: data.results ?? [] });
  } catch {
    return Response.json({ results: [] });
  }
}
