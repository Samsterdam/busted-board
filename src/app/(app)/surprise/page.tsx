"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Shuffle, Bookmark, BookmarkCheck, Eye } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { CinemaScoreBadge, ThreeScoreRow } from "@/components/feed/ScoreDisplay";
import { StarRating } from "@/components/ratings/StarRating";
import type { FeedItem } from "@/lib/recommendation-engine";
import { RATING_SOURCE_USER } from "@/lib/config/ratings";
import { toast } from "sonner";

export default function SurprisePage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [pickIndex, setPickIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());
  const [userRatings, setUserRatings] = useState<Record<number, number>>({});
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch("/api/recommendations/feed")
      .then((r) => r.json())
      .then((data) => {
        const items: FeedItem[] = data.feed ?? [];
        setFeed(items);
        if (items.length > 0) setPickIndex(Math.floor(Math.random() * items.length));
      })
      .catch(() => toast.error("Could not load a suggestion."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/ratings")
      .then((r) => r.json())
      .then((data) => {
        const map: Record<number, number> = {};
        for (const r of data.ratings ?? []) map[r.tmdbId] = r.rating;
        setUserRatings(map);
      })
      .catch(() => null);
  }, []);

  function tryAnother() {
    if (feed.length < 2) return;
    let next: number;
    do { next = Math.floor(Math.random() * feed.length); } while (next === pickIndex);
    setPickIndex(next);
  }

  const item = pickIndex !== null ? feed[pickIndex] : null;

  async function handleRate(rating: number) {
    if (!item) return;
    setUserRatings((prev) => ({ ...prev, [item.tmdbId]: rating }));
    await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tmdbId: item.tmdbId,
        tmdbType: item.tmdbType,
        title: item.title,
        posterPath: item.posterUrl,
        rating,
        source: RATING_SOURCE_USER,
      }),
    }).catch(() => null);
    toast.success("Rating saved!");
  }

  async function handleWatchlist() {
    if (!item) return;
    const inList = watchlistIds.has(item.tmdbId);
    setWatchlistIds((prev) => {
      const next = new Set(prev);
      if (inList) next.delete(item.tmdbId); else next.add(item.tmdbId);
      return next;
    });
    await fetch("/api/watchlist", {
      method: inList ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId: item.tmdbId, tmdbType: item.tmdbType, title: item.title, posterPath: item.posterUrl }),
    }).catch(() => null);
    toast.success(inList ? "Removed from watchlist" : "Saved to watchlist");
  }

  async function handleSeen() {
    if (!item || seenIds.has(item.tmdbId)) return;
    setSeenIds((prev) => new Set([...prev, item.tmdbId]));
    await fetch("/api/watched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId: item.tmdbId, tmdbType: item.tmdbType, title: item.title, posterPath: item.posterUrl }),
    }).catch(() => null);
    toast.success("Marked as watched");
  }

  if (loading) {
    return (
      <PageShell className="px-4 py-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Surprise Me</h1>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="skeleton aspect-[2/3] w-48 rounded-xl" />
          <div className="skeleton h-6 w-40 rounded" />
          <div className="skeleton h-4 w-32 rounded" />
        </div>
      </PageShell>
    );
  }

  if (!item) {
    return (
      <PageShell className="px-4 py-4">
        <h1 className="text-2xl font-bold mb-6">Surprise Me</h1>
        <p className="text-center text-muted-foreground py-16">
          No suggestions available yet.{" "}
          <a href="/watched" className="text-primary underline-offset-2 hover:underline">
            Add more ratings
          </a>{" "}
          to unlock personalised picks.
        </p>
      </PageShell>
    );
  }

  const inWatchlist = watchlistIds.has(item.tmdbId);
  const alreadySeen = seenIds.has(item.tmdbId);
  const currentRating = userRatings[item.tmdbId] ?? 0;

  return (
    <PageShell className="px-4 py-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Surprise Me</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={tryAnother}
          disabled={feed.length < 2}
          className="gap-1.5 text-muted-foreground"
          aria-label="Pick a different movie"
        >
          <Shuffle className="h-4 w-4" aria-hidden="true" />
          Try Another
        </Button>
      </div>

      <div className="flex flex-col items-center gap-5 max-w-sm mx-auto">
        {item.posterUrl && (
          <div className="relative aspect-[2/3] w-48 rounded-xl overflow-hidden shadow-lg">
            <Image src={item.posterUrl} alt={`Poster for ${item.title}`} fill className="object-cover" unoptimized />
          </div>
        )}

        <div className="text-center">
          <h2 className="text-xl font-bold leading-tight">{item.title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{item.year} · {item.originalLanguage.toUpperCase()}</p>
        </div>

        <div className="flex flex-col items-center gap-2 w-full">
          <CinemaScoreBadge score={item.cinemaScore} tooltip={item.scoreTooltip} />
          <ThreeScoreRow
            criticsScore={item.criticsScore}
            audienceScore={item.audienceScore}
            voteCount={item.voteCount}
            userRating={currentRating || undefined}
            size="md"
          />
        </div>

        {item.whyYoullLikeThis && (
          <blockquote className="border-l-2 border-primary pl-3 text-sm text-muted-foreground italic w-full">
            &ldquo;{item.whyYoullLikeThis}&rdquo;
          </blockquote>
        )}

        <p className="text-sm text-muted-foreground line-clamp-4 w-full">{item.overview}</p>

        {item.platforms.length > 0 && (
          <div className="flex flex-wrap gap-1.5 w-full">
            {item.platforms.map((p) => (
              <span key={p} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-foreground">{p}</span>
            ))}
          </div>
        )}

        <div className="border-t border-border pt-4 w-full space-y-1.5">
          <p className="text-sm font-medium">Your rating</p>
          <StarRating value={currentRating} onChange={handleRate} size="md" />
        </div>

        <div className="flex gap-2 w-full pb-4">
          <Button variant="outline" size="sm" onClick={handleWatchlist} className="flex-1 border-border"
            aria-label={inWatchlist ? "Remove from watchlist" : "Save to watchlist"}>
            {inWatchlist
              ? <><BookmarkCheck className="h-4 w-4 mr-1 text-primary" aria-hidden="true" />Saved</>
              : <><Bookmark className="h-4 w-4 mr-1" aria-hidden="true" />Save</>}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSeen} disabled={alreadySeen}
            className="flex-1 border-border" aria-label="Mark as seen">
            <Eye className={`h-4 w-4 mr-1 ${alreadySeen ? "text-green-400" : ""}`} aria-hidden="true" />
            {alreadySeen ? "Seen" : "Mark Seen"}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
