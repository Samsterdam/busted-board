"use client";

import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { RefreshCw, Gem, LayoutGrid, Grid2x2, Rows3, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecommendationCard } from "./RecommendationCard";
import { MovieDetailModal } from "./MovieDetailModal";
import { AdBanner } from "@/components/ads/AdBanner";
import { slotHasActiveProvider } from "@/lib/ads/registry";
import type { FeedItem } from "@/lib/recommendation-engine";
import { MIN_RATINGS_FOR_PROFILE } from "@/lib/config/ratings";
import { toFeedItem, FeedSkeleton, EmptyState } from "./FeedStates";
import { useWatchedIds } from "./hooks/useWatchedIds";
import { toast } from "sonner";

const AD_INTERVAL = 8; // insert an ad band after every N cards (only when ads are on)

// Whether a real ad provider owns the in-feed banner slot. When false (ads off),
// the feed inserts no ad band at all — it just stays a uniform grid of movie
// tiles. Flipping NEXT_PUBLIC_AD_PRIMARY to a provider turns the bands back on.
const ADS_ACTIVE = slotHasActiveProvider("feed-banner");

interface Props {
  ratingCount: number;
  platforms: { name: string; tmdbId: number }[];
}

export function RecommendationFeed({ ratingCount, platforms }: Props) {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gemsOnly, setGemsOnly] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<number>>(new Set());

  // Search: null = browsing the feed; an array (possibly empty) = showing results.
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FeedItem[] | null>(null);
  const [similarResults, setSimilarResults] = useState<FeedItem[]>([]);
  const [searchExplanation, setSearchExplanation] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q || searching) return;
    setSearching(true);
    try {
      const res = await fetch("/api/recommendations/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setSearchResults((data.results ?? []).map(toFeedItem));
      setSimilarResults((data.similar ?? []).map(toFeedItem));
      setSearchExplanation(data.explanation ?? null);
    } catch {
      toast.error("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setSearchQuery("");
    setSearchResults(null);
    setSimilarResults([]);
    setSearchExplanation(null);
  }

  function togglePlatform(tmdbId: number) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(tmdbId)) next.delete(tmdbId);
      else next.add(tmdbId);
      return next;
    });
  }
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
  const [watchedIds, setWatchedIds] = useWatchedIds();
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

  // Fetch-on-mount. loadFeed() sets loading=true synchronously, but `loading`
  // already starts true, so this is a no-op re-set, not a cascading render.
  // eslint-disable-next-line react-hooks/set-state-in-effect
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
      if (inList) next.delete(item.tmdbId);
      else next.add(item.tmdbId);
      return next;
    });

    await fetch("/api/watchlist", {
      method: inList ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId: item.tmdbId, tmdbType: item.tmdbType, title: item.title, posterPath: item.posterUrl }),
    }).catch(() => null);

    toast.success(inList ? "Removed from watchlist" : "Added to watchlist");
  }

  async function handleWatched(item: FeedItem) {
    setFeed((f) => f.filter((i) => i.tmdbId !== item.tmdbId));
    setWatchedIds((prev) => new Set([...prev, item.tmdbId]));
    await fetch("/api/watched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId: item.tmdbId, tmdbType: item.tmdbType, title: item.title, posterPath: item.posterUrl }),
    }).catch(() => null);
    toast.success("Marked as watched");
  }

  const displayed = feed.filter((i) => {
    if (gemsOnly && i.ribbon !== "gem") return false;
    if (selectedPlatforms.size > 0 && !(i.platformIds ?? []).some((id) => selectedPlatforms.has(id))) return false;
    return true;
  });

  // When a search is active, results take over the grid; the feed (and its
  // gem/platform filters) is set aside until the user clears the search.
  const inSearchMode = searchResults !== null;
  const items = inSearchMode ? searchResults : displayed;

  if (loading) return <FeedSkeleton />;

  if (needsRatings || ratingCount < MIN_RATINGS_FOR_PROFILE) {
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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Busted Board</h1>
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

      {/* Search */}
      <form onSubmit={runSearch} className="relative mb-3">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title or vibe — e.g. “feel-good 90s sci-fi”"
          aria-label="Search for something to watch"
          className="pl-9 pr-20"
        />
        <Button
          type="submit"
          size="sm"
          disabled={searching || !searchQuery.trim()}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
        >
          {searching ? "…" : "Search"}
        </Button>
      </form>

      {/* Search results header */}
      {inSearchMode && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="min-w-0 text-sm text-muted-foreground">
            {searchExplanation || "Search results"}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="shrink-0 text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" aria-hidden="true" /> Clear
          </Button>
        </div>
      )}

      {/* Platform filter chips */}
      {!inSearchMode && platforms.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4" role="group" aria-label="Filter by streaming service">
          {platforms.map((p) => {
            const active = selectedPlatforms.has(p.tmdbId);
            return (
              <button
                key={p.tmdbId}
                type="button"
                onClick={() => togglePlatform(p.tmdbId)}
                aria-pressed={active}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.name}
              </button>
            );
          })}
          {selectedPlatforms.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedPlatforms(new Set())}
              className="px-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {!inSearchMode && staleWarning && (
        <p className="mb-3 text-xs text-amber-400 bg-amber-900/20 rounded px-3 py-2" role="alert">
          {staleWarning} — showing cached results.
        </p>
      )}

      {items.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          {inSearchMode
            ? "No matches found. Try a different search."
            : selectedPlatforms.size > 0
            ? "No loaded recommendations on the selected service(s). Try clearing the filter or scroll to load more."
            : gemsOnly
            ? "No hidden gems found on your platforms right now."
            : "No recommendations found."}
        </p>
      )}

      {/* Grid */}
      <div
        className={GRID_CLASSES[cardSize]}
        role="list"
        aria-label={inSearchMode ? "Search results" : "Recommendations"}
      >
        {items.map((item, index) => {
          const showAd = ADS_ACTIVE && (index + 1) % AD_INTERVAL === 0;
          return (
            <Fragment key={item.tmdbId}>
              <div role="listitem">
                <RecommendationCard
                  item={item}
                  userRating={userRatings[item.tmdbId]}
                  inWatchlist={watchlistIds.has(item.tmdbId)}
                  inWatched={watchedIds.has(item.tmdbId)}
                  onClick={() => setSelectedItem(item)}
                  onRate={() => setSelectedItem(item)}
                  onDismiss={() => handleDismiss(item)}
                  onWatchlist={() => handleWatchlist(item)}
                  onWatched={() => handleWatched(item)}
                />
              </div>
              {/* Ad band every N cards — only when ads are on. Off → nothing
                  here, so the feed is just more movie tiles. */}
              {showAd && (
                <div className="col-span-2 sm:col-span-3 lg:col-span-4">
                  <AdBanner />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {/* More like this — similar titles for the searched query */}
      {inSearchMode && similarResults.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">More like this</h2>
          <div className={GRID_CLASSES[cardSize]} role="list" aria-label="Similar titles">
            {similarResults.map((item) => (
              <div key={item.tmdbId} role="listitem">
                <RecommendationCard
                  item={item}
                  userRating={userRatings[item.tmdbId]}
                  inWatchlist={watchlistIds.has(item.tmdbId)}
                  inWatched={watchedIds.has(item.tmdbId)}
                  onClick={() => setSelectedItem(item)}
                  onRate={() => setSelectedItem(item)}
                  onDismiss={() => handleDismiss(item)}
                  onWatchlist={() => handleWatchlist(item)}
                  onWatched={() => handleWatched(item)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Infinite scroll sentinel — feed only; search results aren't paginated */}
      {hasMore && !inSearchMode && (
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
