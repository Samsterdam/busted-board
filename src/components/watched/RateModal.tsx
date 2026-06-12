"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StarRating } from "@/components/ratings/StarRating";
import { toast } from "sonner";

interface Props {
  tmdbId?: number;
  tmdbType?: "movie" | "tv";
  title?: string;
  posterPath?: string | null;
  initialRating?: number;
  initialNotes?: string;
  onClose: () => void;
  onSaved: (rating: number, notes: string) => void;
}

interface SearchResult {
  id: number;
  title?: string;
  name?: string;
  media_type: "movie" | "tv";
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
}

export function RateModal({
  tmdbId: initialTmdbId,
  tmdbType: initialType,
  title: initialTitle,
  posterPath: initialPoster,
  initialRating = 0,
  initialNotes = "",
  onClose,
  onSaved,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(
    initialTmdbId ? {
      id: initialTmdbId,
      title: initialTitle,
      media_type: initialType ?? "movie",
      poster_path: initialPoster,
    } : null
  );
  const [rating, setRating] = useState(initialRating);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.results ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const displayTitle = selected?.title ?? selected?.name ?? initialTitle ?? "";
  const displayPoster = selected?.poster_path ?? initialPoster;

  async function handleSave() {
    if (!selected || rating === 0) return;
    setSaving(true);
    try {
      await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: selected.id,
          tmdbType: selected.media_type,
          title: displayTitle,
          posterPath: displayPoster,
          rating,
          notes: notes || null,
        }),
      });
      toast.success("Rating saved!");
      onSaved(rating, notes);
    } catch {
      toast.error("Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm border-border bg-card" aria-label="Rate a movie or show">
        <h2 className="text-lg font-semibold">
          {initialTmdbId ? `Rate: ${initialTitle}` : "Add a Rating"}
        </h2>

        {!initialTmdbId && (
          <div className="space-y-2">
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                search(e.target.value);
              }}
              placeholder="Search for a movie or show..."
              className="bg-secondary border-border"
              aria-label="Search for title to rate"
            />
            {searching && <p className="text-xs text-muted-foreground">Searching…</p>}
            {searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-secondary space-y-1 p-1">
                {searchResults.slice(0, 6).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setSelected(r); setSearchResults([]); setSearchQuery(""); }}
                    className="flex w-full items-center gap-2 rounded p-2 text-left text-sm hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-primary"
                    aria-label={`Select ${r.title ?? r.name}`}
                  >
                    {r.poster_path && (
                      <Image
                        src={`https://image.tmdb.org/t/p/w92${r.poster_path}`}
                        alt=""
                        width={24}
                        height={36}
                        className="rounded flex-shrink-0 object-cover"
                        unoptimized
                        aria-hidden="true"
                      />
                    )}
                    <span className="truncate">{r.title ?? r.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{r.media_type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selected && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary p-3">
            {displayPoster && (
              <Image
                src={`https://image.tmdb.org/t/p/w92${displayPoster}`}
                alt={`Poster for ${displayTitle}`}
                width={36}
                height={54}
                className="rounded object-cover flex-shrink-0"
                unoptimized
              />
            )}
            <p className="text-sm font-medium truncate">{displayTitle}</p>
          </div>
        )}

        {selected && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1.5">Your rating</p>
              <StarRating value={rating} onChange={setRating} size="md" />
            </div>
            <div>
              <label htmlFor="notes" className="text-sm font-medium">
                Notes <span className="text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="I loved it because…"
                className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary resize-none"
                rows={2}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={!selected || rating === 0 || saving}
            className="flex-1 bg-primary text-primary-foreground"
          >
            {saving ? "Saving…" : "Save Rating"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
