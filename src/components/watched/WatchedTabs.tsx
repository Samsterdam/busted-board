"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, Plus, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StarRating } from "@/components/ratings/StarRating";
import { RateModal } from "./RateModal";
import { toast } from "sonner";

interface Rated {
  id: number;
  tmdbId: number;
  tmdbType: string;
  title: string;
  posterPath: string | null;
  rating: number;
  notes: string | null;
  watchStatus: string;
  createdAt: Date | null;
}

interface WatchlistItem {
  id: number;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  addedAt: Date | null;
}

interface Props {
  watched: Rated[];
  watchlist: WatchlistItem[];
}

export function WatchedTabs({ watched: initial, watchlist: initialWatchlist }: Props) {
  const [tab, setTab] = useState<"watched" | "watchlist">("watched");
  const [watched, setWatched] = useState(initial);
  const [wantToWatch, setWantToWatch] = useState(initialWatchlist);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const editingItem = editingId != null ? watched.find((w) => w.id === editingId) : null;

  const filteredWatched = watched.filter((w) =>
    w.title.toLowerCase().includes(query.toLowerCase())
  );
  const filteredWatchlist = wantToWatch.filter((w) =>
    w.title.toLowerCase().includes(query.toLowerCase())
  );

  async function handleDeleteRating(id: number) {
    setWatched((prev) => prev.filter((w) => w.id !== id));
    await fetch(`/api/ratings/${id}`, { method: "DELETE" }).catch(() => null);
    toast.success("Rating removed");
  }

  async function handleDeleteWatchlist(tmdbId: number) {
    setWantToWatch((prev) => prev.filter((w) => w.tmdbId !== tmdbId));
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId }),
    }).catch(() => null);
    toast.success("Removed from watchlist");
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">
          {tab === "watched" ? "Watched" : "Want to Watch"}
        </h1>
        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-primary-foreground"
          aria-label="Add new rating"
        >
          <Plus className="h-4 w-4 mr-1" aria-hidden="true" /> Add
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {(["watched", "watchlist"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "watched" ? `Watched (${watched.length})` : `Want to Watch (${wantToWatch.length})`}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="pl-9 bg-secondary border-border"
          aria-label="Search titles"
        />
      </div>

      {/* Watched list */}
      {tab === "watched" && (
        <div className="space-y-2" role="list" aria-label="Watched movies and shows">
          {filteredWatched.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              {query ? "No results." : "No movies rated yet. Add one to get started."}
            </p>
          )}
          {filteredWatched.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              role="listitem"
            >
              <div className="relative h-14 w-10 flex-shrink-0 rounded overflow-hidden bg-muted">
                {item.posterPath ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w92${item.posterPath}`}
                    alt={`Poster for ${item.title}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <StarRating value={item.rating} onChange={() => {}} readOnly size="sm" />
                {item.notes && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{item.notes}</p>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setEditingId(item.id)}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary"
                  aria-label={`Edit rating for ${item.title}`}
                >
                  <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteRating(item.id)}
                  className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-2 focus-visible:outline-primary"
                  aria-label={`Delete rating for ${item.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Watchlist */}
      {tab === "watchlist" && (
        <div className="space-y-2" role="list" aria-label="Want to watch list">
          {filteredWatchlist.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              {query ? "No results." : "Your watchlist is empty. Bookmark movies from the feed!"}
            </p>
          )}
          {filteredWatchlist.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              role="listitem"
            >
              <div className="relative h-14 w-10 flex-shrink-0 rounded overflow-hidden bg-muted">
                {item.posterPath ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w92${item.posterPath}`}
                    alt={`Poster for ${item.title}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : null}
              </div>
              <p className="flex-1 text-sm font-medium truncate">{item.title}</p>
              <button
                type="button"
                onClick={() => handleDeleteWatchlist(item.tmdbId)}
                className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-2 focus-visible:outline-primary"
                aria-label={`Remove ${item.title} from watchlist`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editingItem && (
        <RateModal
          tmdbId={editingItem.tmdbId}
          tmdbType={editingItem.tmdbType as "movie" | "tv"}
          title={editingItem.title}
          posterPath={editingItem.posterPath}
          initialRating={editingItem.rating}
          initialNotes={editingItem.notes ?? ""}
          onClose={() => setEditingId(null)}
          onSaved={(rating, notes) => {
            setWatched((prev) =>
              prev.map((w) => w.id === editingItem.id ? { ...w, rating, notes } : w)
            );
            setEditingId(null);
          }}
        />
      )}

      {/* Add new modal */}
      {showAddModal && (
        <RateModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
