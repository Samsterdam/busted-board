"use client";

import { useState } from "react";
import { Edit2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { StarRating } from "@/components/ratings/StarRating";
import { RateModal } from "./RateModal";
import { MediaRow, RowIconButton } from "./MediaRow";
import type { WatchedEntry } from "@/lib/watched/merge-watched";

interface Props {
  entries: WatchedEntry[];
  query: string;
}

/**
 * The merged "Watched" list — rated titles (from `ratings`) and rating-less
 * "seen" titles (from `watched`) shown as one list. Unrated rows expose an
 * inline Rate action that promotes them to a rated entry in place.
 */
export function WatchedList({ entries: initial, query }: Props) {
  const [entries, setEntries] = useState(initial);
  // The entry key currently open in the rate/edit modal, or null.
  const [modalKey, setModalKey] = useState<string | null>(null);

  const filtered = entries.filter((e) => e.title.toLowerCase().includes(query.toLowerCase()));
  const modalEntry = modalKey ? entries.find((e) => e.key === modalKey) ?? null : null;

  async function handleDelete(entry: WatchedEntry) {
    setEntries((prev) => prev.filter((e) => e.key !== entry.key));
    // A title can live in both tables; clear it from both so it fully leaves
    // "Watched" (and can resurface in the feed).
    await Promise.all([
      fetch("/api/watched", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: entry.tmdbId, tmdbType: entry.tmdbType }),
      }).catch(() => null),
      entry.ratingId != null
        ? fetch(`/api/ratings/${entry.ratingId}`, { method: "DELETE" }).catch(() => null)
        : Promise.resolve(null),
    ]);
    toast.success("Removed from watched");
  }

  function handleSaved(rating: number, notes: string, id?: number) {
    setEntries((prev) =>
      prev.map((e) =>
        e.key === modalKey ? { ...e, rating, notes, ratingId: id ?? e.ratingId } : e
      )
    );
    setModalKey(null);
  }

  return (
    <div className="space-y-2" role="list" aria-label="Watched movies and shows">
      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          {query ? "No results." : "Nothing here yet. Add a rating or mark titles as watched from the feed."}
        </p>
      )}
      {filtered.map((entry) => {
        const rated = entry.ratingId != null;
        return (
          <MediaRow
            key={entry.key}
            title={entry.title}
            posterPath={entry.posterPath}
            actions={
              <>
                {rated ? (
                  <RowIconButton
                    icon={Edit2}
                    label={`Edit rating for ${entry.title}`}
                    onClick={() => setModalKey(entry.key)}
                  />
                ) : (
                  <RowIconButton
                    icon={Star}
                    label={`Rate ${entry.title}`}
                    onClick={() => setModalKey(entry.key)}
                  />
                )}
                <RowIconButton
                  icon={Trash2}
                  label={`Remove ${entry.title} from watched`}
                  onClick={() => handleDelete(entry)}
                  destructive
                />
              </>
            }
          >
            {entry.rating != null ? (
              <>
                <StarRating value={entry.rating} onChange={() => {}} readOnly size="sm" />
                {entry.notes && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.notes}</p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Not rated</p>
            )}
          </MediaRow>
        );
      })}

      {modalEntry && (
        <RateModal
          tmdbId={modalEntry.tmdbId}
          tmdbType={modalEntry.tmdbType as "movie" | "tv"}
          title={modalEntry.title}
          posterPath={modalEntry.posterPath}
          initialRating={modalEntry.rating}
          initialNotes={modalEntry.notes ?? ""}
          onClose={() => setModalKey(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
