// Merges the two "I've watched this" data sources into one presentation list.
// `ratings` holds rated titles (a real taste signal); `watched` holds the
// rating-less "seen it" mark. They're separate tables for backend reasons but
// the user thinks of them as one list. Dependency-free so it can run on the
// server (page query) or be unit-tested in isolation.

export interface RatingRow {
  id: number;
  tmdbId: number;
  tmdbType: string;
  title: string;
  posterPath: string | null;
  rating: number;
  notes: string | null;
  createdAt: Date | null;
}

export interface WatchedRow {
  tmdbId: number;
  tmdbType: string;
  title: string;
  posterPath: string | null;
  seenAt: Date | null;
}

export interface WatchedEntry {
  key: string;
  tmdbId: number;
  tmdbType: string;
  title: string;
  posterPath: string | null;
  rating?: number;
  notes?: string | null;
  ratingId?: number; // present ⇒ this entry is rated
  date: Date | null;
}

export function mediaKey(tmdbId: number, tmdbType: string): string {
  return `${tmdbId}-${tmdbType}`;
}

/**
 * Combine rated + seen rows, deduped by (tmdbId, tmdbType). When a title exists
 * in both, the rating record wins (so it renders with stars). Sorted newest
 * first by the relevant timestamp.
 */
export function mergeWatched(ratings: RatingRow[], watched: WatchedRow[]): WatchedEntry[] {
  const byKey = new Map<string, WatchedEntry>();

  for (const r of ratings) {
    const key = mediaKey(r.tmdbId, r.tmdbType);
    byKey.set(key, {
      key,
      tmdbId: r.tmdbId,
      tmdbType: r.tmdbType,
      title: r.title,
      posterPath: r.posterPath,
      rating: r.rating,
      notes: r.notes,
      ratingId: r.id,
      date: r.createdAt,
    });
  }

  for (const w of watched) {
    const key = mediaKey(w.tmdbId, w.tmdbType);
    if (byKey.has(key)) continue; // rating record already represents this title
    byKey.set(key, {
      key,
      tmdbId: w.tmdbId,
      tmdbType: w.tmdbType,
      title: w.title,
      posterPath: w.posterPath,
      date: w.seenAt,
    });
  }

  return [...byKey.values()].sort((a, b) => {
    const at = a.date ? a.date.getTime() : 0;
    const bt = b.date ? b.date.getTime() : 0;
    return bt - at;
  });
}
