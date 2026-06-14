"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageShell } from "@/components/layout/PageShell";
import { VibeTagEditor } from "@/components/taste/VibeTagEditor";
import { toast } from "sonner";
import { MIN_RATINGS_FOR_PROFILE } from "@/lib/config/ratings";

interface TasteProfile {
  top_themes: string[];
  avoid_themes: string[];
  fav_directors: string[];
  fav_actors: string[];
  tone_description: string | null;
}

export default function TastePage() {
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [ratingCount, setRatingCount] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/taste-profile/analyze").then((r) => r.json()),
      fetch("/api/ratings").then((r) => r.json()),
    ]).then(([taste, rated]) => {
      setProfile(taste.profile);
      setRatingCount(rated.ratings?.length ?? 0);
    }).catch(() => null).finally(() => setLoading(false));
  }, []);

  async function regenerate() {
    setRegenerating(true);
    try {
      const res = await fetch("/api/taste-profile/analyze", { method: "POST" });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setProfile(data.profile);
      toast.success("Taste profile updated!");
    } catch {
      toast.error("Could not regenerate profile.");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <PageShell className="px-4 py-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Your Taste Profile</h1>
        <div className="flex gap-2">
          <Link href="/quiz" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Take Quiz →
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={regenerate}
            disabled={regenerating || ratingCount < MIN_RATINGS_FOR_PROFILE}
            aria-label="Regenerate taste profile"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${regenerating ? "animate-spin" : ""}`} aria-hidden="true" />
            Regenerate
          </Button>
        </div>
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="skeleton h-24 rounded-xl" />
          <div className="skeleton h-16 rounded-xl" />
          <div className="skeleton h-16 rounded-xl" />
        </div>
      )}

      {!loading && ratingCount < MIN_RATINGS_FOR_PROFILE && (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-4xl mb-3">🎬</p>
          <p className="text-sm text-muted-foreground">
            Rate at least 3 movies to generate your taste profile.
          </p>
          <div className="mt-4 flex flex-col gap-2 items-center">
            <Link
              href="/quiz"
              className={buttonVariants({ className: "bg-primary text-primary-foreground w-full max-w-xs" })}
            >
              Take Taste Quiz →
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => window.location.href = "/watched"}
            >
              Or rate movies manually
            </Button>
          </div>
        </div>
      )}

      {!loading && ratingCount >= MIN_RATINGS_FOR_PROFILE && !profile && (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            You have {ratingCount} ratings. Generate your taste profile to see what we know about your preferences.
          </p>
          <Button onClick={regenerate} disabled={regenerating} className="bg-primary text-primary-foreground">
            {regenerating ? "Generating…" : "Generate Profile"}
          </Button>
        </div>
      )}

      {!loading && profile && (
        <div className="space-y-5">
          {/* Summary */}
          {profile.tone_description && (
            <blockquote
              className="border-l-2 border-primary pl-4 text-sm text-muted-foreground italic rounded-r-xl bg-card py-3 pr-3"
              aria-label="Your taste description"
            >
              &ldquo;{profile.tone_description}&rdquo;
            </blockquote>
          )}

          <ChipSection label="Themes you love" items={profile.top_themes} color="primary" />
          <ChipSection label="You tend to avoid" items={profile.avoid_themes} color="destructive" />
          <ChipSection label="Directors you like" items={profile.fav_directors} color="muted" />
          <ChipSection label="Actors you enjoy" items={profile.fav_actors} color="muted" />

          <div>
            <p className="text-sm font-medium mb-2">Vibes (tap to edit)</p>
            <VibeTagEditor />
          </div>

          <p className="text-xs text-muted-foreground">Based on {ratingCount} ratings</p>
        </div>
      )}
    </PageShell>
  );
}

function ChipSection({ label, items, color }: { label: string; items: string[]; color: string }) {
  if (!items?.length) return null;
  const colorMap: Record<string, string> = {
    primary: "bg-primary/15 text-primary border-primary/30",
    destructive: "bg-destructive/15 text-destructive border-destructive/30",
    muted: "bg-secondary text-muted-foreground border-border",
  };
  return (
    <div>
      <p className="text-sm font-medium mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5" role="list" aria-label={label}>
        {items.map((item) => (
          <span
            key={item}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${colorMap[color] ?? colorMap.muted}`}
            role="listitem"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
