import { PublicMovieCard } from "./PublicMovieCard";
import type { PublicMediaItem } from "@/app/api/recommendations/public/browse/route";
import { APP_URL } from "@/lib/config/app";

interface Props {
  platform?: string;
}

async function fetchItems(platform?: string): Promise<PublicMediaItem[]> {
  const qs = platform ? `?platform=${platform}` : "";
  try {
    const res = await fetch(`${APP_URL}/api/recommendations/public/browse${qs}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json() as { items: PublicMediaItem[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

export async function PublicMovieGrid({ platform }: Props) {
  const items = await fetchItems(platform);

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">No titles available yet.</p>
        <p className="text-xs mt-1">Check back after the next catalog sync.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <PublicMovieCard key={`${item.tmdbType}:${item.tmdbId}`} item={item} />
      ))}
    </div>
  );
}
