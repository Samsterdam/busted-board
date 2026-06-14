"use client";

import { RecommendationCard } from "./RecommendationCard";
import type { FeedItem } from "@/lib/recommendation-engine";

interface Props {
  title: string;
  subtitle?: string;
  items: FeedItem[];
  gridClass: string;
  platformLabels?: boolean;
  userRatings: Record<number, number>;
  watchlistIds: Set<number>;
  watchedIds: Set<number>;
  onItemClick: (item: FeedItem) => void;
  onRate: (item: FeedItem) => void;
  onDismiss: (item: FeedItem) => void;
  onWatchlist: (item: FeedItem) => void;
  onWatched: (item: FeedItem) => void;
  onThumbsUp: (item: FeedItem) => void;
}

export function ResultsSection({
  title,
  subtitle,
  items,
  gridClass,
  platformLabels,
  userRatings,
  watchlistIds,
  watchedIds,
  onItemClick,
  onRate,
  onDismiss,
  onWatchlist,
  onWatched,
  onThumbsUp,
}: Props) {
  return (
    <div className="mt-8">
      <h2 className="mb-1 text-lg font-semibold">{title}</h2>
      {subtitle && <p className="mb-3 text-sm text-muted-foreground">{subtitle}</p>}
      <div className={gridClass} role="list" aria-label={title}>
        {items.map((item) => (
          <div key={item.tmdbId} role="listitem">
            {platformLabels && item.platforms[0] && (
              <p className="mb-1 truncate text-center text-xs text-muted-foreground">
                {item.platforms[0]}
              </p>
            )}
            <RecommendationCard
              item={item}
              userRating={userRatings[item.tmdbId]}
              inWatchlist={watchlistIds.has(item.tmdbId)}
              inWatched={watchedIds.has(item.tmdbId)}
              onClick={() => onItemClick(item)}
              onRate={() => onRate(item)}
              onDismiss={() => onDismiss(item)}
              onWatchlist={() => onWatchlist(item)}
              onWatched={() => onWatched(item)}
              onThumbsUp={() => onThumbsUp(item)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
