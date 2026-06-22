"use client";

import { useState } from "react";

const HTTP_TOO_MANY_REQUESTS = 429;
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  SUGGESTION_PLATFORM_NAME_MAX_LENGTH,
  SUGGESTION_NOTES_MAX_LENGTH,
  SUGGESTION_URL_MAX_LENGTH,
} from "@/lib/config/suggestions";
import posthog from "posthog-js";
import { EVENTS } from "@/lib/config/analytics";

interface Props {
  onSubmitted: () => void;
  onCancel: () => void;
}

export function SuggestPlatformForm({ onSubmitted, onCancel }: Props) {
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/suggestions/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          websiteUrl: websiteUrl.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        if (res.status === HTTP_TOO_MANY_REQUESTS) {
          toast.error("You've reached the daily suggestion limit. Try again tomorrow.");
        } else {
          toast.error(data.error ?? "Could not submit suggestion.");
        }
        return;
      }
      toast.success("Thanks! We'll review your suggestion.");
      posthog.capture(EVENTS.PLATFORM_SUGGESTION_SUBMITTED, { name: name.trim() });
      onSubmitted();
    } catch {
      toast.error("Could not submit suggestion.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-border bg-secondary/40 p-3">
      <p className="text-xs font-medium text-muted-foreground">Suggest a free streaming platform</p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Platform name (e.g. Freevee, Crunchyroll)"
        maxLength={SUGGESTION_PLATFORM_NAME_MAX_LENGTH}
        required
        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary"
        aria-label="Platform name"
      />
      <input
        type="url"
        value={websiteUrl}
        onChange={(e) => setWebsiteUrl(e.target.value)}
        placeholder="Website URL (optional)"
        maxLength={SUGGESTION_URL_MAX_LENGTH}
        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary"
        aria-label="Platform website URL (optional)"
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Any notes? (optional)"
        maxLength={SUGGESTION_NOTES_MAX_LENGTH}
        rows={2}
        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary"
        aria-label="Notes (optional)"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="flex-1" disabled={submitting || !name.trim()}>
          {submitting ? "Submitting…" : "Suggest platform"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} className="border-border">
          Cancel
        </Button>
      </div>
    </form>
  );
}
