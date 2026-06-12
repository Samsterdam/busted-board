import { NextRequest } from "next/server";
import { searchMulti } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get("q");
  if (!q) return Response.json({ results: [] });

  try {
    const data = await searchMulti(q);
    return Response.json({ results: data.results ?? [] });
  } catch {
    return Response.json({ results: [] });
  }
}
