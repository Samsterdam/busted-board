import { Button } from "@/components/ui/button";
import type { FeedItem } from "@/lib/recommendation-engine";
import { MIN_RATINGS_FOR_PROFILE } from "@/lib/config/ratings";

// The /api/recommendations/search endpoint returns a leaner item than the feed
// (no rank/voteCount/scoreTooltip/etc). Coerce to a full FeedItem so search
// results can reuse RecommendationCard and MovieDetailModal unchanged.
export function toFeedItem(
  r: Partial<FeedItem> & { tmdbId: number; tmdbType: "movie" | "tv"; title: string }
): FeedItem {
  return {
    tmdbId: r.tmdbId,
    tmdbType: r.tmdbType,
    title: r.title,
    year: r.year ?? "",
    posterUrl: r.posterUrl ?? null,
    overview: r.overview ?? "",
    originalLanguage: r.originalLanguage ?? "",
    platforms: r.platforms ?? [],
    platformIds: r.platformIds ?? [],
    audienceScore: r.audienceScore ?? null,
    criticsScore: r.criticsScore ?? null,
    cinemaScore: r.cinemaScore ?? null,
    voteCount: r.voteCount ?? null,
    ribbon: r.ribbon ?? null,
    scoreTooltip: r.scoreTooltip ?? [],
    whyYoullLikeThis: r.whyYoullLikeThis ?? "",
    rank: r.rank ?? 0,
  };
}

export function GridSkeleton({ gridClass }: { gridClass: string }) {
  return (
    <div className={gridClass}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden">
          <div className="skeleton aspect-[2/3] w-full" />
          <div className="p-2 space-y-2">
            <div className="skeleton h-3 w-3/4 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ rated, onRate }: { rated: number; onRate: () => void }) {
  const remaining = MIN_RATINGS_FOR_PROFILE - rated;
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-4xl mb-4">🎬</p>
      <h2 className="text-xl font-semibold mb-2">
        Rate {remaining} more {remaining === 1 ? "movie" : "movies"} to unlock your feed
      </h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        We need at least {MIN_RATINGS_FOR_PROFILE} ratings to start making personalized recommendations.
      </p>
      <Button onClick={onRate} className="bg-primary text-primary-foreground">
        Rate Movies →
      </Button>
    </div>
  );
}
