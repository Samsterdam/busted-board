"use client";

import { useState } from "react";

const HTTP_TOO_MANY_REQUESTS = 429;
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LINK_LABEL_MAX_LENGTH, LINK_URL_MAX_LENGTH } from "@/lib/config/community";
import posthog from "posthog-js";
import { EVENTS } from "@/lib/config/analytics";

type FormState =
  | "idle"
  | "submitting"
  | "domain_error"
  | "suggesting"
  | "suggestion_success";

interface Props {
  tmdbId: number;
  tmdbType: string;
  mediaTitle?: string;
  onSubmitted: () => void;
  onCancel: () => void;
}

interface DomainErrorInfo {
  domain?: string;
  url: string;
  label: string;
}

export function CommunityLinkSubmitForm({ tmdbId, tmdbType, mediaTitle, onSubmitted, onCancel }: Props) {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [domainInfo, setDomainInfo] = useState<DomainErrorInfo | null>(null);

  const submitting = formState === "submitting" || formState === "suggesting";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setFormState("submitting");
    try {
      const res = await fetch("/api/community-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, tmdbType, url: url.trim(), label: label.trim() || undefined }),
      });
      const data = (await res.json()) as {
        error?: string;
        domain?: string;
        message?: string;
        id?: number;
        created?: boolean;
      };

      if (!res.ok) {
        if (data.error === "domain_not_allowed") {
          setDomainInfo({ domain: data.domain, url: url.trim(), label: label.trim() });
          setFormState("domain_error");
          return;
        }
        toast.error(data.message ?? data.error ?? "Could not submit link.");
        setFormState("idle");
        return;
      }
      toast.success(data.created ? "Link added!" : "Link already exists.");
      posthog.capture(EVENTS.COMMUNITY_LINK_SUBMITTED, { tmdbId, tmdbType });
      onSubmitted();
    } catch {
      toast.error("Could not submit link.");
      setFormState("idle");
    }
  }

  async function handleSuggest() {
    if (!domainInfo) return;
    setFormState("suggesting");
    try {
      const res = await fetch("/api/suggestions/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId,
          tmdbType,
          mediaTitle: mediaTitle ?? undefined,
          url: domainInfo.url,
          label: domainInfo.label || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        if (data.error === "already_suggested") {
          toast.info("This link was already submitted for review.");
        } else if (res.status === HTTP_TOO_MANY_REQUESTS) {
          toast.error("You've reached the daily suggestion limit. Try again tomorrow.");
        } else {
          toast.error(data.error ?? "Could not submit suggestion.");
        }
        setFormState("domain_error");
        return;
      }
      setFormState("suggestion_success");
    } catch {
      toast.error("Could not submit suggestion.");
      setFormState("domain_error");
    }
  }

  if (formState === "suggestion_success") {
    return (
      <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-2">
        <p className="text-xs font-medium text-foreground">Suggestion submitted</p>
        <p className="text-xs text-muted-foreground">
          Thanks! We&apos;ll review <span className="font-mono text-[10px]">{domainInfo?.domain}</span> and add it if it&apos;s a legal free source.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} className="border-border">
          Close
        </Button>
      </div>
    );
  }

  if (formState === "domain_error" && domainInfo) {
    return (
      <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-2">
        <p className="text-xs font-medium text-foreground">Domain not on the approved list</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono text-[10px]">{domainInfo.domain ?? domainInfo.url}</span> isn&apos;t an approved streaming domain yet.
        </p>
        <p className="text-xs text-muted-foreground">Want to suggest it for review?</p>
        <div className="flex gap-2">
          <Button type="button" size="sm" className="flex-1" onClick={handleSuggest} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit for review"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setFormState("idle")} className="border-border">
            Back
          </Button>
        </div>
      </div>
    );
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
