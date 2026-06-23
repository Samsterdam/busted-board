"use client";

import { useState } from "react";
import { Trash2, RotateCcw, Clock } from "lucide-react";
import { toast } from "sonner";
import { MediaRow, RowIconButton } from "./MediaRow";

export interface DismissedItem {
  id: number;
  tmdbId: number;
  tmdbType: string;
  title: string | null;
  posterPath: string | null;
  // true ⇒ a soft "maybe later" dismissal the user flagged for a second chance.
  secondChance: boolean | null;
  dismissedAt: Date | null;
}

interface Props {
  items: DismissedItem[];
  query: string;
}

export function NotInterestedList({ items: initial, query }: Props) {
  const [items, setItems] = useState(initial);
  const filtered = items
    .filter((d) => (d.title ?? "").toLowerCase().includes(query.toLowerCase()))
    // Surface the "give it a chance" pile first — those are the ones the user
    // deliberately set aside to revisit, not the hard nos.
    .sort((a, b) => Number(b.secondChance ?? false) - Number(a.secondChance ?? false));

  async function handleUndismiss(tmdbId: number, tmdbType: string, secondChance: boolean) {
    setItems((prev) => prev.filter((d) => !(d.tmdbId === tmdbId && d.tmdbType === tmdbType)));
    await fetch("/api/feed/dismiss", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId, tmdbType }),
    }).catch(() => null);
    toast.success(secondChance ? "Giving it another chance — back in your feed" : "Back in your feed");
  }

  return (
    <div className="space-y-2" role="list" aria-label="Not interested list">
      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          {query ? "No results." : "Nothing here. Use the X on feed cards to mark titles you're not interested in."}
        </p>
      )}
      {filtered.map((item) => {
        const secondChance = item.secondChance ?? false;
        const title = item.title ?? "Untitled";
        return (
          <MediaRow
            key={item.id}
            title={title}
            posterPath={item.posterPath}
            actions={
              <RowIconButton
                icon={secondChance ? RotateCcw : Trash2}
                label={
                  secondChance
                    ? `Give ${title} another chance`
                    : `Remove ${title} from not interested`
                }
                onClick={() => handleUndismiss(item.tmdbId, item.tmdbType, secondChance)}
                destructive={!secondChance}
              />
            }
          >
            {secondChance && (
              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                <Clock className="h-2.5 w-2.5" aria-hidden={true} /> Maybe later
              </span>
            )}
          </MediaRow>
        );
      })}
    </div>
  );
}
