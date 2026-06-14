"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LINK_LABEL_MAX_LENGTH, LINK_URL_MAX_LENGTH } from "@/lib/config/community";

interface Props {
  tmdbId: number;
  tmdbType: string;
  onSubmitted: () => void;
  onCancel: () => void;
}

export function CommunityLinkSubmitForm({ tmdbId, tmdbType, onSubmitted, onCancel }: Props) {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/community-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, tmdbType, url: url.trim(), label: label.trim() || undefined }),
      });
      const data = await res.json() as { error?: string; id?: number; created?: boolean };
      if (!res.ok) {
        toast.error(data.error ?? "Could not submit link.");
        return;
      }
      toast.success(data.created ? "Link added!" : "Link already exists.");
      onSubmitted();
    } catch {
      toast.error("Could not submit link.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-border bg-secondary/40 p-3">
      <p className="text-xs font-medium text-muted-foreground">Submit a free streaming link</p>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://www.youtube.com/watch?v=..."
        maxLength={LINK_URL_MAX_LENGTH}
        required
        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary"
        aria-label="Free streaming URL"
      />
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (optional) — e.g. Full movie on YouTube"
        maxLength={LINK_LABEL_MAX_LENGTH}
        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary"
        aria-label="Link label (optional)"
      />
      <p className="text-[10px] text-muted-foreground/60">
        Only links to free, legal sources on allowed platforms are accepted.
      </p>
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="flex-1" disabled={submitting || !url.trim()}>
          {submitting ? "Submitting…" : "Submit"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} className="border-border">
          Cancel
        </Button>
      </div>
    </form>
  );
}
