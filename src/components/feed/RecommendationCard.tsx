"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Bookmark, BookmarkCheck, Eye, ThumbsUp, Ban, Clock } from "lucide-react";
import type { FeedItem } from "@/lib/recommendation-engine";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { CinemaScoreBadge, ThreeScoreRow } from "./ScoreDisplay";
import { RibbonBadge } from "./RibbonBadge";

interface Props {
  item: FeedItem;
  userRating?: number;
  inWatchlist?: boolean;
  inWatched?: boolean;
  onRate: () => void;
  // secondChance=true means "not now, maybe later" (soft); false means a hard no.
  onDismiss: (secondChance: boolean) => void;
  onWatchlist: () => void;
  onWatched: () => void;
  onThumbsUp: () => void;
  onClick: () => void;
}

export function RecommendationCard({
  item,
  userRating,
  inWatchlist,
  inWatched,
  onRate,
  onDismiss,
  onWatchlist,
  onWatched,
  onThumbsUp,
  onClick,
}: Props) {
  const [choosingDismiss, setChoosingDismiss] = useState(false);

  return (
    <div className="group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-black/40">
      {/* Poster */}
      <button
        type="button"
        onClick={onClick}
        className="relative aspect-[2/3] w-full overflow-hidden bg-muted focus-visible:outline-2 focus-visible:outline-primary"
        aria-label={`View details for ${item.title}`}
      >
        {item.posterUrl ? (
          <Image
            src={item.posterUrl}
            alt={`Movie poster for ${item.title} (${item.year})`}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            unoptimized
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs px-2 text-center">
            {item.title}
          </div>
        )}

        <RibbonBadge ribbon={item.ribbon} />
      </button>

      {/* Action buttons (show on hover). Sibling of the poster button — not
          nested inside it — since <button> cannot contain other <button>s.
          Positioned over the poster via the card root's `relative`. */}
      <div className="pointer-events-none absolute right-1.5 top-1.5 flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <Tooltip>
          <TooltipTrigger
            type="button"
            onClick={() => setChoosingDismiss(true)}
            className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-900/80 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
            aria-label={`Not interested in ${item.title}`}
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent side="left">Not interested</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            type="button"
            onClick={onWatchlist}
            className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-primary/80 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
            aria-label={inWatchlist ? `Remove ${item.title} from watchlist` : `Add ${item.title} to watchlist`}
          >
            {inWatchlist
              ? <BookmarkCheck className="h-3 w-3 text-primary" aria-hidden="true" />
              : <Bookmark className="h-3 w-3" aria-hidden="true" />
            }
          </TooltipTrigger>
          <TooltipContent side="left">{inWatchlist ? "Remove from watchlist" : "Add to watchlist"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            type="button"
            onClick={onWatched}
            className={`pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-green-700/80 transition-colors focus-visible:outline-2 focus-visible:outline-primary ${inWatched ? "opacity-60" : ""}`}
            aria-label={`Mark ${item.title} as watched`}
          >
            <Eye className={`h-3 w-3 ${inWatched ? "text-green-400" : ""}`} aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent side="left">Mark as watched</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            type="button"
            onClick={onThumbsUp}
            className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-amber-600/80 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
            aria-label={`Like ${item.title}`}
          >
            <ThumbsUp className="h-3 w-3" aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent side="left">Like this</TooltipContent>
        </Tooltip>
      </div>

      {/* Dismiss choice — soft ("maybe later") vs hard ("not for me"). Both
          remove the title from the feed; soft ones are flagged for a second
          chance in the Not Interested list. */}
      {choosingDismiss && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-stretch justify-center gap-2 bg-black/85 p-3 text-center"
          role="dialog"
          aria-label={`Not interested in ${item.title}`}
        >
          <p className="text-xs font-medium text-white">Not interested?</p>
          <button
            type="button"
            onClick={() => { setChoosingDismiss(false); onDismiss(true); }}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-600/90 px-2 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Maybe later
          </button>
          <button
            type="button"
            onClick={() => { setChoosingDismiss(false); onDismiss(false); }}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-red-900/90 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-900 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Ban className="h-3.5 w-3.5" aria-hidden="true" /> Not for me
          </button>
          <button
            type="button"
            onClick={() => setChoosingDismiss(false)}
            className="text-[11px] text-white/70 hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-primary"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Info */}
      <div className="flex flex-col gap-1.5 p-2">
        <div>
          <p className="text-sm font-semibold leading-tight line-clamp-1">{item.title}</p>
          <p className="text-xs text-muted-foreground">
            {item.year}
            {item.tmdbType === "tv" && (
              <span className="ml-1 rounded bg-primary/15 px-1 py-px text-[9px] font-medium text-primary">TV</span>
            )}
          </p>
        </div>

        {/* Cinema Score */}
        <div className="flex justify-center">
          <CinemaScoreBadge score={item.cinemaScore} tooltip={item.scoreTooltip} />
        </div>

        {/* Three-score row */}
        <ThreeScoreRow
          criticsScore={item.criticsScore}
          audienceScore={item.audienceScore}
          voteCount={item.voteCount}
          userRating={userRating}
          onRate={onRate}
        />

        {/* Platform badges */}
        {item.platforms.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.platforms.slice(0, 2).map((p) => (
              <span
                key={p}
                className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {p}
              </span>
            ))}
            {item.platforms.length > 2 && (
              <span className="text-[10px] text-muted-foreground">+{item.platforms.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
