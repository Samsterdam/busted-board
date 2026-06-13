"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const SUGGESTED_VIBES = [
  "slow burn", "feel-good", "cerebral", "action-packed", "dark comedy",
  "sci-fi", "thriller", "romance", "documentary", "foreign language",
  "classic", "horror", "animation", "arthouse",
];

// Cap on how many vibe suggestions to surface at once.
const MAX_VIBE_SUGGESTIONS = 8;

export function VibeTagEditor() {
  const [tags, setTags] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/vibe-tags")
      .then((r) => r.json())
      .then((d) => setTags(d.tags ?? []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  async function addTag(tag: string) {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed || tags.includes(trimmed)) return;
    setTags((prev) => [...prev, trimmed]);
    setInput("");
    await fetch("/api/vibe-tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: [trimmed] }),
    }).catch(() => null);
  }

  async function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
    await fetch("/api/vibe-tags", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    }).catch(() => { toast.error("Could not remove tag."); });
  }

  if (loading) return <div className="skeleton h-10 rounded-xl" />;

  const suggestions = SUGGESTED_VIBES.filter((v) => !tags.includes(v));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="list" aria-label="Your vibe tags">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
            role="listitem"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag} tag`}
              className="hover:text-destructive transition-colors focus-visible:outline-1 focus-visible:outline-primary"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <span className="text-xs text-muted-foreground">No vibes added yet</span>
        )}
      </div>

      {/* Add custom */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTag(input)}
          placeholder="Add a vibe..."
          className="bg-secondary border-border text-sm h-8"
          aria-label="Add a vibe tag"
        />
        <button
          type="button"
          onClick={() => addTag(input)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0 focus-visible:outline-2 focus-visible:outline-primary"
          aria-label="Add vibe tag"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.slice(0, MAX_VIBE_SUGGESTIONS).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => addTag(v)}
              className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary"
              aria-label={`Add ${v} vibe`}
            >
              + {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
