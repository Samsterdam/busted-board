"use client";

import { useState, useEffect } from "react";
import { Shuffle } from "lucide-react";
import posthog from "posthog-js";
import { EVENTS } from "@/lib/config/analytics";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/PageShell";
import { RecommendationCard } from "@/components/feed/RecommendationCard";
import { RateModal } from "@/components/watched/RateModal";
import { MoodChips } from "./MoodChips";
import { useWatchedIds } from "@/components/feed/hooks/useWatchedIds";
import { toast } from "sonner";
import type { FeedItem } from "@/lib/recommendation-engine";
import { SURPRISE_RESHUFFLE_PROMPT_AT } from "@/lib/config/surprise";
import { RATING_SOURCE_USER } from "@/lib/config/ratings";
import type { Mood } from "@/lib/config/surprise";

const CARDS_PER_VIEW = 3;

export function SurpriseView() {
  const [pool, setPool] = useState<FeedItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [reshuffleCount, setReshuffleCount] = useState(0);
  const [mood, setMood] = useState<Mood | null>(null);
  const [loading, setLoading] = useState(true); // true on mount — effect sets false when fetch resolves
  const [isEmpty, setIsEmpty] = useState(false);
  const [rateTarget, setRateTarget] = useState<FeedItem | null>(null);
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());
  const [watchedIds, setWatchedIds] = useWatchedIds();

  async function fetchPool(selectedMood: Mood | null) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedMood) params.set("genre", selectedMood);
      const data = await fetch(`/api/recommendations/surprise?${params}`).then((r) => r.json());
      const items: FeedItem[] = data.feed ?? [];
      setPool(items);
      setOffset(0);
      setIsEmpty(items.length === 0);
    } catch {
      toast.error("Could not load suggestions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch("/api/recommendations/surprise")
      .then((r) => r.json())
      .then((data) => {
        const items: FeedItem[] = data.feed ?? [];
        setPool(items);
        setIsEmpty(items.length === 0);
      })
      .catch(() => toast.error("Could not load suggestions."))
      .finally(() => setLoading(false));
  }, []);

  async function reshuffle() {
    posthog.capture(EVENTS.FEED_RESHUFFLED);
    const nextOffset = offset + CARDS_PER_VIEW;
    if (nextOffset < pool.length) {
      setOffset(nextOffset);
    } else {
      await fetchPool(mood);
    }
    setReshuffleCount((c) => c + 1);
  }

  async function handleMoodSelect(selected: Mood) {
    posthog.capture(EVENTS.MOOD_FILTER_APPLIED, { mood: selected });
    setMood(selected);
    setReshuffleCount(0);
    await fetchPool(selected);
  }

  async function handleMoodClear() {
    setMood(null);
    setReshuffleCount(0);
    await fetchPool(null);
  }

  function removeFromPool(tmdbId: number) {
    setPool((prev) => prev.filter((item) => item.tmdbId !== tmdbId));
  }

  async function handleDismiss(item: FeedItem, secondChance: boolean) {
    removeFromPool(item.tmdbId);
    await fetch("/api/feed/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tmdbId: item.tmdbId,
        tmdbType: item.tmdbType,
        title: item.title,
        posterPath: item.posterUrl,
        secondChance,
      }),
    }).catch(() => null);
  }

  async function handleWatched(item: FeedItem) {
    removeFromPool(item.tmdbId);
    setWatchedIds((prev) => new Set([...prev, item.tmdbId]));
    await fetch("/api/watched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId: item.tmdbId, tmdbType: item.tmdbType, title: item.title, posterPath: item.posterUrl }),
    }).catch(() => null);
    toast.success("Marked as watched");
  }

  async function handleWatchlist(item: FeedItem) {
    const inList = watchlistIds.has(item.tmdbId);
    setWatchlistIds((prev) => { const s = new Set(prev); if (inList) { s.delete(item.tmdbId); } else { s.add(item.tmdbId); } return s; });
    await fetch("/api/watchlist", {
      method: inList ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId: item.tmdbId, tmdbType: item.tmdbType, title: item.title, posterPath: item.posterUrl }),
    }).catch(() => null);
    toast.success(inList ? "Removed from watchlist" : "Saved to watchlist");
  }

  async function handleThumbsUp(item: FeedItem) {
    removeFromPool(item.tmdbId);
    await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId: item.tmdbId, tmdbType: item.tmdbType, title: item.title, posterPath: item.posterUrl, rating: 5, source: "quick" }),
    }).catch(() => null);
    toast.success("Loved it!");
  }

  const visible = pool.slice(offset, offset + CARDS_PER_VIEW);
  const showMoodPrompt = reshuffleCount >= SURPRISE_RESHUFFLE_PROMPT_AT;

  if (loading) {
    return (
      <PageShell className="px-4 py-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Surprise Me</h1>
        </div>
        <div className="space-y-4">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-40 w-full rounded-2xl" />)}
        </div>
      </PageShell>
    );
  }

  if (isEmpty) {
    return (
      <PageShell className="px-4 py-4">
        <h1 className="text-2xl font-bold mb-6">Surprise Me</h1>
        <p className="text-center text-muted-foreground py-16 text-sm">
          {mood
            ? `Nothing found for "${mood}" on your platforms. `
            : "Nothing new to suggest right now. "}
          {mood
            ? <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={handleMoodClear}>Clear the mood filter</button>
            : <a href="/settings" className="text-primary underline-offset-2 hover:underline">Add more streaming services</a>
          }
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Surprise Me</h1>
        <Button variant="ghost" size="sm" onClick={reshuffle} className="gap-1.5 text-muted-foreground">
          <Shuffle className="h-4 w-4" aria-hidden="true" />
          Reshuffle
        </Button>
      </div>

      {showMoodPrompt && (
        <div className="mb-4">
          <MoodChips mood={mood} onSelect={handleMoodSelect} onClear={handleMoodClear} />
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {visible.map((item) => (
          <RecommendationCard
            key={item.tmdbId}
            item={item}
            inWatchlist={watchlistIds.has(item.tmdbId)}
            inWatched={watchedIds.has(item.tmdbId)}
            onRate={() => setRateTarget(item)}
            onDismiss={(secondChance) => handleDismiss(item, secondChance)}
            onWatchlist={() => handleWatchlist(item)}
            onWatched={() => handleWatched(item)}
            onThumbsUp={() => handleThumbsUp(item)}
            onClick={() => setRateTarget(item)}
          />
        ))}
      </div>

      {rateTarget && (
        <RateModal
          tmdbId={rateTarget.tmdbId}
          tmdbType={rateTarget.tmdbType}
          title={rateTarget.title}
          posterPath={rateTarget.posterUrl}
          onClose={() => setRateTarget(null)}
          onSaved={(rating) => {
            fetch("/api/ratings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tmdbId: rateTarget.tmdbId, tmdbType: rateTarget.tmdbType, title: rateTarget.title, posterPath: rateTarget.posterUrl, rating, source: RATING_SOURCE_USER }),
            }).catch(() => null);
            setRateTarget(null);
            toast.success("Rating saved!");
          }}
        />
      )}
    </PageShell>
  );
}
