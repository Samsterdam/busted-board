"use client";

import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RateModal } from "./RateModal";
import { WatchedList } from "./WatchedList";
import { WatchlistList, type WatchlistItem } from "./WatchlistList";
import { NotInterestedList, type DismissedItem } from "./NotInterestedList";
import type { WatchedEntry } from "@/lib/watched/merge-watched";

type TabKey = "watchlist" | "watched" | "dismissed";

interface Props {
  watched: WatchedEntry[];
  watchlist: WatchlistItem[];
  dismissed: DismissedItem[];
}

/**
 * Shell for the /watched page: three intent buckets — Want to Watch (watchlist),
 * Watched (rated + seen, merged), Not Interested (dismissed). Owns tab + search
 * state and the "Add a rating" modal; each list manages its own item state.
 */
export function WatchedTabs({ watched, watchlist, dismissed }: Props) {
  const [tab, setTab] = useState<TabKey>("watched");
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "watchlist", label: "Want to Watch", count: watchlist.length },
    { key: "watched", label: "Watched", count: watched.length },
    { key: "dismissed", label: "Not Interested", count: dismissed.length },
  ];
  const heading = tabs.find((t) => t.key === tab)?.label ?? "";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">{heading}</h1>
        <Button
          size="sm"
          onClick={() => setShowAdd(true)}
          className="bg-primary text-primary-foreground"
          aria-label="Add new rating"
        >
          <Plus className="h-4 w-4 mr-1" aria-hidden="true" /> Add
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label} ({t.count})
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

      {/* Active list */}
      {tab === "watchlist" && <WatchlistList items={watchlist} query={query} />}
      {tab === "watched" && <WatchedList entries={watched} query={query} />}
      {tab === "dismissed" && <NotInterestedList items={dismissed} query={query} />}

      {/* Add new rating */}
      {showAdd && (
        <RateModal
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
