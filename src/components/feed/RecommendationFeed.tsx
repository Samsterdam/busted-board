"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, Gem, LayoutGrid, Grid2x2, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecommendationCard } from "./RecommendationCard";
import { MovieDetailModal } from "./MovieDetailModal";
import { AdBanner } from "@/components/ads/AdBanner";
import type { FeedItem } from "@/lib/recommendation-engine";
import { toast } from "sonner";

interface Props {
  userId: string;
  ratingCount: number;
  platformNames: string[];
}

export function RecommendationFeed({ userId, ratingCount, platformNames }: Props) {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gemsOnly, setGemsOnly] = useState(false);
  const [cardSize, setCardSize] = useState<"sm" | "md" | "lg">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("bb_card_size") as "sm" | "md" | "lg") ?? "sm";
    }
    return "sm";
  });

  function cycleSize() {
    setCardSize((prev) => {
      const next = prev === "sm" ? "md" : prev === "md" ? "lg" : "sm";
      localStorage.setItem("bb_card_size", next);
      return next;
    });
  }

  const GRID_CLASSES = {
    sm: "grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7",
    md: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    lg: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
  };
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());
  const [userRatings, setUserRatings] = useState<Record<number, number>>({});
  const [needsRatings, setNeedsRatings] = useState(false);
  const [staleWarning, setStaleWarning] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/recommendations/feed${refresh ? "?refresh=1" : ""}`);
      const data = await res.json();

      if (data.needsRatings) {
        setNeedsRatings(true);
        return;
      }

      setFeed(data.feed ?? []);
      setStaleWarning(data.stale ? data.error : null);
      if (data.error && !data.stale) toast.error(data.error);
    } catch {
      toast.error("Could not load recommendations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load user ratings for the feed items
  useEffect(() => {
    if (feed.length === 0) return;
    fetch("/api/ratings")
      .then((r) => r.json())
      .then((data) => {
        const map: Record<number, number> = {};
        for (const r of data.ratings ?? []) map[r.tmdbId] = r.rating;
        setUserRatings(map);
      })
      .catch(() => null);
  }, [feed]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || feed.length === 0) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const seenIds = feed.map((i) => i.tmdbId).join(",");
    try {
      const res = await fetch(`/api/recommendations/feed?page=${nextPage}&seenIds=${seenIds}`);
      const data = await res.json();
      const newItems: typeof feed = data.feed ?? [];
      if (newItems.length === 0) { setHasMore(false); return; }
      setFeed((prev) => [...prev, ...newItems]);
      setPage(nextPage);
    } catch {
      // silently fail — user can scroll up and retry
    } finally {
      setLoadingMore(false);
    }
  }, [feed, loadingMore, hasMore, page]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  async function handleDismiss(item: FeedItem) {
    setFeed((f) => f.filter((i) => i.tmdbId !== item.tmdbId));
    await fetch("/api/feed/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId: item.tmdbId, tmdbType: item.tmdbType }),
    }).catch(() => null);
  }

  async function handleWatchlist(item: FeedItem) {
    const inList = watchlistIds.has(item.tmdbId);
    setWatchlistIds((prev) => {
      const next = new Set(prev);
      inList ? next.delete(item.tmdbId) : next.add(item.tmdbId);
      return next;
    });

    await fetch("/api/watchlist", {
      method: inList ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId: item.tmdbId, tmdbType: item.tmdbType, title: item.title, posterPath: item.posterUrl }),
    }).catch(() => null);

    toast.success(inList ? "Removed from watchlist" : "Added to watchlist");
  }

  const displayed = gemsOnly ? feed.filter((i) => i.ribbon === "gem") : feed;

  if (loading) return <FeedSkeleton />;

  if (needsRatings || ratingCount < 3) {
    return (
      <EmptyState
        rated={ratingCount}
        onRate={() => window.location.href = "/watched"}
      />
    );
  }

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">Busted Board</h1>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setGemsOnly((v) => !v)}
            className={gemsOnly ? "text-primary" : "text-muted-foreground"}
            aria-pressed={gemsOnly}
            aria-label="Show hidden gems only"
          >
            <Gem className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={cycleSize}
            className="text-muted-foreground"
            aria-label={`Card size: ${cardSize}. Click to change.`}
            title={`Card size: ${cardSize}`}
          >
            {cardSize === "sm" && <LayoutGrid className="h-4 w-4" aria-hidden="true" />}
            {cardSize === "md" && <Grid2x2 className="h-4 w-4" aria-hidden="true" />}
            {cardSize === "lg" && <Rows3 className="h-4 w-4" aria-hidden="true" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadFeed(true)}
            disabled={refreshing}
            aria-label="Refresh recommendations"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Platform chips */}
      {platformNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4" aria-label="Your streaming services">
          {platformNames.slice(0, 4).map((p) => (
            <span key={p} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
              {p}
            </span>
          ))}
          {platformNames.length > 4 && (
            <span className="text-xs text-muted-foreground self-center">+{platformNames.length - 4} more</span>
          )}
        </div>
      )}

      {staleWarning && (
        <p className="mb-3 text-xs text-amber-400 bg-amber-900/20 rounded px-3 py-2" role="alert">
          {staleWarning} — showing cached results.
        </p>
      )}

      {displayed.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          {gemsOnly ? "No hidden gems found on your platforms right now." : "No recommendations found."}
        </p>
      )}

      {/* Grid */}
      <div
        className={GRID_CLASSES[cardSize]}
        role="list"
        aria-label="Recommendations"
      >
        {displayed.map((item, index) => (
          <>
            <div key={item.tmdbId} role="listitem">
              <RecommendationCard
                item={item}
                userRating={userRatings[item.tmdbId]}
                inWatchlist={watchlistIds.has(item.tmdbId)}
                onClick={() => setSelectedItem(item)}
                onRate={() => setSelectedItem(item)}
                onDismiss={() => handleDismiss(item)}
                onWatchlist={() => handleWatchlist(item)}
              />
            </div>
            {/* Insert ad after every 8 items */}
            {(index + 1) % 8 === 0 && (
              <div key={`ad-${index}`} className="col-span-2 sm:col-span-3 lg:col-span-4">
                <AdBanner />
              </div>
            )}
          </>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="py-4 flex justify-center">
          {loadingMore && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 w-full">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden border border-border">
                  <div className="skeleton aspect-[2/3] w-full" />
                  <div className="p-2 space-y-1.5">
                    <div className="skeleton h-2.5 w-3/4 rounded" />
                    <div className="skeleton h-5 w-8 rounded mx-auto" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail modal */}
      {selectedItem && (
        <MovieDetailModal
          item={selectedItem}
          userRating={userRatings[selectedItem.tmdbId]}
          inWatchlist={watchlistIds.has(selectedItem.tmdbId)}
          onClose={() => setSelectedItem(null)}
          onWatchlist={() => handleWatchlist(selectedItem)}
          onRated={(rating) => {
            setUserRatings((prev) => ({ ...prev, [selectedItem.tmdbId]: rating }));
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="px-4 py-4">
      <div className="skeleton h-8 w-40 mb-4 rounded" />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
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
    </div>
  );
}

function EmptyState({ rated, onRate }: { rated: number; onRate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-4xl mb-4">🎬</p>
      <h2 className="text-xl font-semibold mb-2">Rate {3 - rated} more {3 - rated === 1 ? "movie" : "movies"} to unlock your feed</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        We need at least 3 ratings to start making personalized recommendations.
      </p>
      <Button onClick={onRate} className="bg-primary text-primary-foreground">
        Rate Movies →
      </Button>
    </div>
  );
}
