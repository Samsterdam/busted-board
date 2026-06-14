"use client";

import Image from "next/image";
import { X, Bookmark, BookmarkCheck, Eye } from "lucide-react";
import type { FeedItem } from "@/lib/recommendation-engine";
import { CinemaScoreBadge, ThreeScoreRow } from "./ScoreDisplay";
import { RibbonBadge } from "./RibbonBadge";

interface Props {
  item: FeedItem;
  userRating?: number;
  inWatchlist?: boolean;
  inWatched?: boolean;
  onRate: () => void;
  onDismiss: () => void;
  onWatchlist: () => void;
  onWatched: () => void;
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
  onClick,
}: Props) {
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
      <div className="pointer-events-none absolute right-1.5 top-1.5 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onDismiss}
          className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-900/80 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
          aria-label={`Hide ${item.title} from feed`}
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onWatchlist}
          className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-primary/80 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
          aria-label={inWatchlist ? `Remove ${item.title} from watchlist` : `Add ${item.title} to watchlist`}
        >
          {inWatchlist
            ? <BookmarkCheck className="h-3 w-3 text-primary" aria-hidden="true" />
            : <Bookmark className="h-3 w-3" aria-hidden="true" />
          }
        </button>
        <button
          type="button"
          onClick={onWatched}
          className={`pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-green-700/80 transition-colors focus-visible:outline-2 focus-visible:outline-primary ${inWatched ? "opacity-60" : ""}`}
          aria-label={`Mark ${item.title} as watched`}
        >
          <Eye className={`h-3 w-3 ${inWatched ? "text-green-400" : ""}`} aria-hidden="true" />
        </button>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1.5 p-2">
        <div>
          <p className="text-sm font-semibold leading-tight line-clamp-1">{item.title}</p>
          <p className="text-xs text-muted-foreground">{item.year}</p>
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
