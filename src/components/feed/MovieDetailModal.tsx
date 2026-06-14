"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Bookmark, BookmarkCheck } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ratings/StarRating";
import { CinemaScoreBadge, ThreeScoreRow } from "./ScoreDisplay";
import { RibbonBadge } from "./RibbonBadge";
import type { FeedItem } from "@/lib/recommendation-engine";
import { toast } from "sonner";

interface Props {
  item: FeedItem;
  userRating?: number;
  inWatchlist?: boolean;
  onClose: () => void;
  onWatchlist: () => void;
  onRated: (rating: number) => void;
}

export function MovieDetailModal({ item, userRating, inWatchlist, onClose, onWatchlist, onRated }: Props) {
  const [currentRating, setCurrentRating] = useState(userRating ?? 0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveRating(rating: number, updatedNotes?: string) {
    if (!rating) return;
    setSaving(true);
    try {
      await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: item.tmdbId,
          tmdbType: item.tmdbType,
          title: item.title,
          posterPath: item.posterUrl,
          rating,
          notes: (updatedNotes ?? notes) || null,
        }),
      });
      toast.success("Rating saved!");
      onRated(rating);
    } catch {
      toast.error("Could not save rating.");
    } finally {
      setSaving(false);
    }
  }

  function handleStarChange(rating: number) {
    setCurrentRating(rating);
    saveRating(rating);
  }

  function handleNotesBlur() {
    if (currentRating > 0 && notes) saveRating(currentRating, notes);
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent
        className="max-w-md border-border bg-card p-0 overflow-hidden"
        aria-label={`Details for ${item.title}`}
      >
        {/* Poster + overlay */}
        <div className="relative aspect-[16/9] w-full bg-muted">
          {item.posterUrl && (
            <Image
              src={item.posterUrl}
              alt={`Movie poster for ${item.title} (${item.year})`}
              fill
              className="object-cover object-center"
              unoptimized
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
          <RibbonBadge ribbon={item.ribbon} />
          <div className="absolute bottom-3 left-3 right-3">
            <h2 className="text-lg font-bold leading-tight">{item.title}</h2>
            <p className="text-sm text-muted-foreground">{item.year} · {item.originalLanguage.toUpperCase()}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Scores */}
          <div className="flex flex-col items-center gap-2">
            <CinemaScoreBadge score={item.cinemaScore} tooltip={item.scoreTooltip} />
            <ThreeScoreRow
              criticsScore={item.criticsScore}
              audienceScore={item.audienceScore}
              voteCount={item.voteCount}
              userRating={userRating}
              size="md"
            />
          </div>

          {/* Why you'll like this */}
          {item.whyYoullLikeThis && (
            <blockquote className="border-l-2 border-primary pl-3 text-sm text-muted-foreground italic">
              &ldquo;{item.whyYoullLikeThis}&rdquo;
            </blockquote>
          )}

          {/* Overview */}
          <p className="text-sm text-muted-foreground line-clamp-3">{item.overview}</p>

          {/* Platforms */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Available on:</p>
            <div className="flex flex-wrap gap-1.5">
              {item.platforms.map((p) => (
                <span key={p} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-foreground">
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Rate */}
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-sm font-medium">Your rating</p>
            <StarRating value={currentRating} onChange={handleStarChange} size="md" />
            {currentRating > 0 && (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Notes (optional) — I loved it because..."
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary resize-none"
                rows={2}
                aria-label="Rating notes"
              />
            )}
            {saving && <p className="text-xs text-muted-foreground">Saving…</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onWatchlist}
              className="flex-1 border-border"
              aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
            >
              {inWatchlist
                ? <><BookmarkCheck className="h-4 w-4 mr-1 text-primary" aria-hidden="true" /> Saved</>
                : <><Bookmark className="h-4 w-4 mr-1" aria-hidden="true" /> Save</>
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
