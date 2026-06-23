"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MediaRow, RowIconButton } from "./MediaRow";

export interface WatchlistItem {
  id: number;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  addedAt: Date | null;
}

interface Props {
  items: WatchlistItem[];
  query: string;
}

export function WatchlistList({ items: initial, query }: Props) {
  const [items, setItems] = useState(initial);
  const filtered = items.filter((w) => w.title.toLowerCase().includes(query.toLowerCase()));

  async function handleDelete(tmdbId: number) {
    setItems((prev) => prev.filter((w) => w.tmdbId !== tmdbId));
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId }),
    }).catch(() => null);
    toast.success("Removed from watchlist");
  }

  return (
    <div className="space-y-2" role="list" aria-label="Want to watch list">
      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          {query ? "No results." : "Your watchlist is empty. Bookmark movies from the feed!"}
        </p>
      )}
      {filtered.map((item) => (
        <MediaRow
          key={item.id}
          title={item.title}
          posterPath={item.posterPath}
          actions={
            <RowIconButton
              icon={Trash2}
              label={`Remove ${item.title} from watchlist`}
              onClick={() => handleDelete(item.tmdbId)}
              destructive
            />
          }
        />
      ))}
    </div>
  );
}
