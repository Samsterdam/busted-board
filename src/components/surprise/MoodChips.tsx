"use client";

import { MOOD_OPTIONS, type Mood } from "@/lib/config/surprise";

interface Props {
  mood: Mood | null;
  onSelect: (m: Mood) => void;
  onClear: () => void;
}

export function MoodChips({ mood, onSelect, onClear }: Props) {
  return (
    <div className="w-full space-y-2">
      <p className="text-sm font-medium text-center text-muted-foreground">
        What are you in the mood for?
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {MOOD_OPTIONS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onSelect(m)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
              mood === m
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground hover:bg-secondary/70"
            }`}
          >
            {m}
          </button>
        ))}
        {mood && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-full px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary"
          >
            Clear ✕
          </button>
        )}
      </div>
    </div>
  );
}
