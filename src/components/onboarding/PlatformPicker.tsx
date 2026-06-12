"use client";

import { PAID_PLATFORMS, FREE_PLATFORMS } from "@/lib/platforms";
import { CheckIcon } from "lucide-react";

interface Props {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function PlatformPicker({ selected, onChange }: Props) {
  function toggle(slug: string) {
    onChange(
      selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">What are you watching on?</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Select all the services you have access to.
      </p>

      <PlatformSection
        title="Paid Services"
        platforms={PAID_PLATFORMS}
        selected={selected}
        onToggle={toggle}
      />
      <PlatformSection
        title="Free Services"
        platforms={FREE_PLATFORMS}
        selected={selected}
        onToggle={toggle}
      />
    </div>
  );
}

function PlatformSection({
  title,
  platforms,
  selected,
  onToggle,
}: {
  title: string;
  platforms: typeof PAID_PLATFORMS;
  selected: string[];
  onToggle: (slug: string) => void;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        {title}
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {platforms.map((p) => {
          const active = selected.includes(p.slug);
          return (
            <button
              key={p.slug}
              type="button"
              aria-pressed={active}
              aria-label={`${p.name}${active ? " (selected)" : ""}`}
              onClick={() => onToggle(p.slug)}
              className={`relative flex flex-col items-center justify-center rounded-xl border p-3 text-xs font-medium transition-all focus-visible:outline-2 focus-visible:outline-primary ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {active && (
                <span className="absolute right-1.5 top-1.5">
                  <CheckIcon className="h-3 w-3" aria-hidden="true" />
                </span>
              )}
              <span className="text-center leading-tight">{p.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
