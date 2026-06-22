"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import { RefreshCw, Gem, LayoutGrid, Grid2x2, Rows3, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecommendationCard } from "./RecommendationCard";
import { MovieDetailModal } from "./MovieDetailModal";
import { AdBanner } from "@/components/ads/AdBanner";
import { slotHasActiveProvider } from "@/lib/ads/registry";
import type { FeedItem } from "@/lib/recommendation-engine";
import { MIN_RATINGS_FOR_PROFILE, RATING_MAX, RATING_SOURCE_QUICK } from "@/lib/config/ratings";
import posthog from "posthog-js";
import { EVENTS } from "@/lib/config/analytics";
import { useFeedPagination } from "./hooks/useFeedPagination";
import { toFeedItem, GridSkeleton, EmptyState } from "./FeedStates";
import { ResultsSection } from "./ResultsSection";
import { PlatformFilter } from "./PlatformFilter";
import { useDiscovery } from "./hooks/useDiscovery";
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
      const results = (data.results ?? []).map(toFeedItem);
      setSearchResults(results);
      setSimilarResults((data.similar ?? []).map(toFeedItem));
      setSearchExplanation(data.explanation ?? null);
      posthog.capture(EVENTS.SEARCH_USED, { query: q, results_count: results.length });
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
  const { discovery, setDiscovery, loadingDiscovery } = useDiscovery(feed.length, loading);
  const { loadingMore, hasMore, needsRatings, staleWarning, sentinelRef, loadFeed } =
    useFeedPagination({ feed, setFeed, setLoading, setRefreshing });

  const didTrackFeedView = useRef(false);
  useEffect(() => {
    if (!loading && feed.length > 0 && !didTrackFeedView.current) {
      didTrackFeedView.current = true;
      posthog.capture(EVENTS.FEED_LOADED, { title_count: feed.length });
    }
  }, [loading, feed.length]);

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

  async function handleDismiss(item: FeedItem) {
    posthog.capture(EVENTS.MOVIE_DISMISSED, { tmdbId: item.tmdbId, title: item.title });
    setFeed((f) => f.filter((i) => i.tmdbId !== item.tmdbId));
    setDiscovery((d) => d.filter((i) => i.tmdbId !== item.tmdbId));
    await fetch("/api/feed/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId: item.tmdbId, tmdbType: item.tmdbType }),
    }).catch(() => null);
  }

  async function handleThumbsUp(item: FeedItem) {
    posthog.capture(EVENTS.MOVIE_RATED, { tmdbId: item.tmdbId, title: item.title, mediaType: item.tmdbType, rating: RATING_MAX });
    setFeed((f) => f.filter((i) => i.tmdbId !== item.tmdbId));
    setDiscovery((d) => d.filter((i) => i.tmdbId !== item.tmdbId));
    await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tmdbId: item.tmdbId,
        tmdbType: item.tmdbType,
        title: item.title,
        posterPath: item.posterUrl,
        rating: RATING_MAX,
        source: RATING_SOURCE_QUICK,
      }),
    }).catch(() => null);
    toast.success("Liked!");
  }

  async function handleWatchlist(item: FeedItem) {
    const inList = watchlistIds.has(item.tmdbId);
    setWatchlistIds((prev) => {
      const next = new Set(prev);
      if (inList) next.delete(item.tmdbId);
      else next.add(item.tmdbId);
      return next;
    });

    if (!inList) {
      setFeed((f) => f.filter((i) => i.tmdbId !== item.tmdbId));
      setDiscovery((d) => d.filter((i) => i.tmdbId !== item.tmdbId));
    }

    posthog.capture(EVENTS.WATCHLIST_TOGGLED, { tmdbId: item.tmdbId, title: item.title, mediaType: item.tmdbType, action: inList ? "remove" : "add" });
    await fetch("/api/watchlist", {
      method: inList ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId: item.tmdbId, tmdbType: item.tmdbType, title: item.title, posterPath: item.posterUrl }),
    }).catch(() => null);

    toast.success(inList ? "Removed from watchlist" : "Added to watchlist");
  }

  async function handleWatched(item: FeedItem) {
    posthog.capture(EVENTS.MOVIE_WATCHED, { tmdbId: item.tmdbId, title: item.title });
    setFeed((f) => f.filter((i) => i.tmdbId !== item.tmdbId));
    setDiscovery((d) => d.filter((i) => i.tmdbId !== item.tmdbId));
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

  if (ratingCount < MIN_RATINGS_FOR_PROFILE) {
    return <EmptyState rated={ratingCount} onRate={() => window.location.href = "/watched"} />;
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Busted Board</h1>

      {/* Sticky command bar: search + action icons + platform/search-results row */}
      <div className="sticky top-0 z-10 -mx-4 px-4 bg-background pb-2">
        <div className="flex items-center gap-2 mb-2">
          <form onSubmit={runSearch} className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={'Search by title or vibe — e.g. "feel-good 90s sci-fi"'}
              aria-label="Search for something to watch"
              className="pl-9 pr-20"
            />
            <Button type="submit" size="sm" disabled={searching || !searchQuery.trim()} className="absolute right-1 top-1/2 -translate-y-1/2 h-7">
              {searching ? "…" : "Search"}
            </Button>
          </form>
          <Button variant="ghost" size="sm" onClick={() => setGemsOnly((v) => !v)}
            className={gemsOnly ? "text-primary" : "text-muted-foreground"}
            aria-pressed={gemsOnly} aria-label="Show hidden gems only">
            <Gem className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="sm" onClick={cycleSize}
            className="text-muted-foreground" aria-label={`Card size: ${cardSize}. Click to change.`} title={`Card size: ${cardSize}`}>
            {cardSize === "sm" && <LayoutGrid className="h-4 w-4" aria-hidden="true" />}
            {cardSize === "md" && <Grid2x2 className="h-4 w-4" aria-hidden="true" />}
            {cardSize === "lg" && <Rows3 className="h-4 w-4" aria-hidden="true" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { posthog.capture(EVENTS.FEED_RESHUFFLED); loadFeed(true); }}
            disabled={refreshing} aria-label="Refresh recommendations">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          </Button>
        </div>

        {inSearchMode ? (
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="min-w-0 text-sm text-muted-foreground">{searchExplanation || "Search results"}</p>
            <Button variant="ghost" size="sm" onClick={clearSearch} className="shrink-0 text-muted-foreground">
              <X className="h-4 w-4 mr-1" aria-hidden="true" /> Clear
            </Button>
          </div>
        ) : (
          <PlatformFilter
            platforms={platforms}
            selectedPlatforms={selectedPlatforms}
            onToggle={togglePlatform}
            onClear={() => setSelectedPlatforms(new Set())}
          />
        )}
      </div>

      {!inSearchMode && staleWarning && (
        <p className="mb-3 text-xs text-amber-400 bg-amber-900/20 rounded px-3 py-2" role="alert">
          {staleWarning} — showing cached results.
        </p>
      )}

      {/* Grid — skeleton while loading, content once feed resolves */}
      {loading ? (
        <GridSkeleton gridClass={GRID_CLASSES[cardSize]} />
      ) : needsRatings ? (
        <EmptyState rated={ratingCount} onRate={() => window.location.href = "/watched"} />
      ) : items.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {inSearchMode
            ? "No matches found. Try a different search."
            : selectedPlatforms.size > 0
            ? "No loaded recommendations on the selected service(s). Try clearing the filter or scroll to load more."
            : gemsOnly
            ? "No hidden gems found on your platforms right now."
            : "No recommendations found."}
        </p>
      ) : (
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
                  onClick={() => { posthog.capture(EVENTS.MOVIE_DETAIL_OPENED, { tmdbId: item.tmdbId, title: item.title, mediaType: item.tmdbType }); setSelectedItem(item); }}
                  onRate={() => setSelectedItem(item)}
                  onDismiss={() => handleDismiss(item)}
                  onWatchlist={() => handleWatchlist(item)}
                  onWatched={() => handleWatched(item)}
                  onThumbsUp={() => handleThumbsUp(item)}
                />
              </div>
              {/* Ad band every N cards — only when ads are on. Off → nothing
                  here, so the feed is just more movie tiles. */}
              {showAd && (
                <div className="col-span-full">
                  <AdBanner />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
      )}

      {/* More like this — similar titles for the searched query */}
      {!loading && inSearchMode && similarResults.length > 0 && (
        <ResultsSection
          title="More like this"
          items={similarResults}
          gridClass={GRID_CLASSES[cardSize]}
          userRatings={userRatings}
          watchlistIds={watchlistIds}
          watchedIds={watchedIds}
          onItemClick={(item) => setSelectedItem(item)}
          onRate={(item) => setSelectedItem(item)}
          onDismiss={handleDismiss}
          onWatchlist={handleWatchlist}
          onWatched={handleWatched}
          onThumbsUp={handleThumbsUp}
        />
      )}

      {/* Discovery — top picks on platforms the user doesn't have yet */}
      {!loading && !inSearchMode && (discovery.length > 0 || loadingDiscovery) && (
        <div className="mt-8">
          {loadingDiscovery ? (
            <GridSkeleton gridClass={GRID_CLASSES[cardSize]} />
          ) : (
            <ResultsSection
              title="Expand your lineup"
              subtitle="Top picks on services you don't have yet"
              platformLabels
              items={discovery}
              gridClass={GRID_CLASSES[cardSize]}
              userRatings={userRatings}
              watchlistIds={watchlistIds}
              watchedIds={watchedIds}
              onItemClick={(item) => setSelectedItem(item)}
              onRate={(item) => setSelectedItem(item)}
              onDismiss={handleDismiss}
              onWatchlist={handleWatchlist}
              onWatched={handleWatched}
              onThumbsUp={handleThumbsUp}
            />
          )}
        </div>
      )}

      {/* Infinite scroll sentinel — feed only; search results aren't paginated */}
      {!loading && hasMore && !inSearchMode && (
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
