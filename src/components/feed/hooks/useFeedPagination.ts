import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import type { FeedItem } from "@/lib/recommendation-engine";
import { FEED_SCROLL_PRELOAD_PX } from "@/lib/config/feed";

interface UseFeedPaginationArgs {
  feed: FeedItem[];
  setFeed: React.Dispatch<React.SetStateAction<FeedItem[]>>;
  setLoading: (v: boolean) => void;
  setRefreshing: (v: boolean) => void;
}

export function useFeedPagination({
  feed,
  setFeed,
  setLoading,
  setRefreshing,
}: UseFeedPaginationArgs) {
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [needsRatings, setNeedsRatings] = useState(false);
  const [staleWarning, setStaleWarning] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const prefetchRef = useRef<Promise<FeedItem[] | null> | null>(null);

  const loadFeed = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    prefetchRef.current = null;

    try {
      const res = await fetch(`/api/recommendations/feed${refresh ? "?refresh=1" : ""}`);
      const data = await res.json();

      if (data.needsRatings) { setNeedsRatings(true); return; }

      setFeed(data.feed ?? []);
      setPage(1);
      setHasMore(true);
      setStaleWarning(data.stale ? data.error : null);
      if (data.error && !data.stale) toast.error(data.error);
    } catch {
      toast.error("Could not load recommendations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setFeed, setLoading, setRefreshing]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || feed.length === 0) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const seenIds = feed.map((i) => i.tmdbId).join(",");
    try {
      const prefetch = prefetchRef.current;
      prefetchRef.current = null;
      const newItems: FeedItem[] = (prefetch ? await prefetch : null) ??
        await fetch(`/api/recommendations/feed?page=${nextPage}&seenIds=${seenIds}`)
          .then((r) => r.json()).then((d) => d.feed ?? []).catch(() => []);
      if (newItems.length === 0) { setHasMore(false); return; }
      setFeed((prev) => [...prev, ...newItems]);
      setPage(nextPage);
    } catch {
      // silently fail — user can scroll up and retry
    } finally {
      setLoadingMore(false);
    }
  }, [feed, loadingMore, hasMore, page, setFeed]);

  // Background-prefetch the next page whenever the current page increments.
  // Fires immediately after page 1 renders so page 2 is ready before the user
  // reaches the bottom.
  useEffect(() => {
    if (!hasMore || feed.length === 0) return;
    const seenIds = feed.map((i) => i.tmdbId).join(",");
    prefetchRef.current = fetch(
      `/api/recommendations/feed?page=${page + 1}&seenIds=${seenIds}`
    )
      .then((r) => r.json())
      .then((d): FeedItem[] => d.feed ?? [])
      .catch(() => null);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: `${FEED_SCROLL_PRELOAD_PX}px` }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return { page, loadingMore, hasMore, needsRatings, staleWarning, sentinelRef, loadFeed, loadMore };
}
