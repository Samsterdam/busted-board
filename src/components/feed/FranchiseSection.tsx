"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { posterSrc } from "@/lib/config/images";
import {
  FRANCHISE_COLLAPSED_PREVIEW_COUNT,
  FRANCHISE_MIN_PARTS_TO_SHOW,
  YEAR_PREFIX_LENGTH,
} from "@/lib/config/feed";
import type { TmdbCollection, TmdbCollectionPart } from "@/lib/tmdb";

function releaseYear(date: string): string {
  return date ? date.slice(0, YEAR_PREFIX_LENGTH) : "TBA";
}

function PartRow({ part, isCurrent, isStart }: { part: TmdbCollectionPart; isCurrent: boolean; isStart: boolean }) {
  const src = posterSrc(part.poster_path, "w92");
  return (
    <li
      className={`flex items-center gap-2.5 rounded-lg p-1.5 ${
        isCurrent ? "bg-secondary" : ""
      }`}
    >
      <div className="relative h-14 w-10 flex-shrink-0 overflow-hidden rounded bg-muted">
        {src && (
          <Image src={src} alt={`Poster for ${part.title}`} fill className="object-cover" unoptimized />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{part.title}</p>
        <p className="text-xs text-muted-foreground">{releaseYear(part.release_date)}</p>
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-0.5">
        {isStart && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
            Start here
          </span>
        )}
        {isCurrent && (
          <span className="text-[10px] text-muted-foreground">You&rsquo;re here</span>
        )}
      </div>
    </li>
  );
}

export function FranchiseSection({ tmdbId, currentTmdbId }: { tmdbId: number; currentTmdbId: number }) {
  const [collection, setCollection] = useState<TmdbCollection | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/tmdb/collection?tmdbId=${tmdbId}`)
      .then((r) => r.json())
      .then((data: { collection?: TmdbCollection | null }) => {
        if (!active) return;
        setCollection(data.collection ?? null);
        setExpanded(false);
      })
      .catch(() => active && setCollection(null));
    return () => {
      active = false;
    };
  }, [tmdbId]);

  if (!collection || collection.parts.length < FRANCHISE_MIN_PARTS_TO_SHOW) return null;

  const { parts } = collection;
  const visible = expanded ? parts : parts.slice(0, FRANCHISE_COLLAPSED_PREVIEW_COUNT);
  const hiddenCount = parts.length - visible.length;
  const startId = parts[0]?.id;

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Where to start</p>
        <p className="text-sm font-medium text-foreground">{collection.name}</p>
        <p className="text-[10px] text-muted-foreground/60">In release order</p>
      </div>
      <ul className="space-y-1">
        {visible.map((part) => (
          <PartRow
            key={part.id}
            part={part}
            isCurrent={part.id === currentTmdbId}
            isStart={part.id === startId}
          />
        ))}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs text-muted-foreground/60 underline hover:text-foreground transition-colors"
        >
          Show all ({parts.length})
        </button>
      )}
    </div>
  );
}
