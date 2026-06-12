"use client";

import { useState } from "react";

const VIBE_OPTIONS = [
  "slow burn", "feel-good", "cerebral", "action-packed", "dark comedy",
  "sci-fi", "thriller", "romance", "documentary", "foreign language",
  "classic", "horror", "animation", "true crime", "fantasy",
  "historical", "indie", "blockbuster", "arthouse", "coming-of-age",
];

export function VibePicker() {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(vibe: string) {
    setSelected((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]
    );
  }

  async function saveVibes(vibes: string[]) {
    if (vibes.length === 0) return;
    await fetch("/api/vibe-tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: vibes }),
    });
  }

  // Save when user navigates away (called by parent on finish)
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__savePendingVibes = () => saveVibes(selected);
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">What&rsquo;s your vibe?</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Pick some moods and genres you enjoy. Skip if you&rsquo;re not sure yet.
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Vibe preferences">
        {VIBE_OPTIONS.map((vibe) => {
          const active = selected.includes(vibe);
          return (
            <button
              key={vibe}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(vibe)}
              className={`rounded-full border px-3 py-1 text-sm transition-all focus-visible:outline-2 focus-visible:outline-primary ${
                active
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {vibe}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">{selected.length} selected</p>
      )}
    </div>
  );
}
