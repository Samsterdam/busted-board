"use client";

interface Props {
  platforms: { name: string; tmdbId: number }[];
  selectedPlatforms: Set<number>;
  onToggle: (tmdbId: number) => void;
  onClear: () => void;
}

export function PlatformFilter({ platforms, selectedPlatforms, onToggle, onClear }: Props) {
  if (platforms.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-4" role="group" aria-label="Filter by streaming service">
      {platforms.map((p) => {
        const active = selectedPlatforms.has(p.tmdbId);
        return (
          <button
            key={p.tmdbId}
            type="button"
            onClick={() => onToggle(p.tmdbId)}
            aria-pressed={active}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.name}
          </button>
        );
      })}
      {selectedPlatforms.size > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="px-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}
