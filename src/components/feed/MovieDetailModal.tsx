"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, Bookmark, BookmarkCheck, Flag } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ratings/StarRating";
import { CinemaScoreBadge, ThreeScoreRow } from "./ScoreDisplay";
import { RibbonBadge } from "./RibbonBadge";
import { CommunityLinkSubmitForm } from "./CommunityLinkSubmitForm";
import { FranchiseSection } from "./FranchiseSection";
import { SuggestPlatformForm } from "@/components/SuggestPlatformForm";
import type { FeedItem } from "@/lib/recommendation-engine";
import { toast } from "sonner";
import { getWatchUrl } from "@/lib/config/affiliates";
import posthog from "posthog-js";
import { EVENTS } from "@/lib/config/analytics";

interface CommunityLink {
  id: number;
  url: string;
  domain: string;
  label: string | null;
  submittedAt: string | null;
}

interface Props {
  item: FeedItem;
  userRating?: number;
  inWatchlist?: boolean;
  onClose: () => void;
  onWatchlist: () => void;
  onRated: (rating: number) => void;
}

export function MovieDetailModal({ item, userRating, inWatchlist, onClose, onWatchlist, onRated }: Props) {
  const [currentRating, setCurrentRating] = useState(userRating ?? 0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [communityLinks, setCommunityLinks] = useState<CommunityLink[] | null>(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [showSuggestPlatform, setShowSuggestPlatform] = useState(false);

  useEffect(() => {
    posthog.capture(EVENTS.MOVIE_DETAIL_OPENED, { tmdbId: item.tmdbId, title: item.title, cinemaScore: item.cinemaScore });
  }, [item.tmdbId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch(`/api/community-links?tmdbId=${item.tmdbId}&tmdbType=${item.tmdbType}`)
      .then((r) => r.json())
      .then((data: { links?: CommunityLink[] }) => setCommunityLinks(data.links ?? []))
      .catch(() => setCommunityLinks([]));
  }, [item.tmdbId, item.tmdbType]);

  async function refetchCommunityLinks() {
    try {
      const r = await fetch(`/api/community-links?tmdbId=${item.tmdbId}&tmdbType=${item.tmdbType}`);
      const data = await r.json() as { links?: CommunityLink[] };
      setCommunityLinks(data.links ?? []);
    } catch {
      // non-fatal
    }
  }

  async function saveRating(rating: number, updatedNotes?: string) {
    if (!rating) return;
    setSaving(true);
    try {
      await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: item.tmdbId,
          tmdbType: item.tmdbType,
          title: item.title,
          posterPath: item.posterUrl,
          rating,
          notes: (updatedNotes ?? notes) || null,
        }),
      });
      toast.success("Rating saved!");
      onRated(rating);
    } catch {
      toast.error("Could not save rating.");
    } finally {
      setSaving(false);
    }
  }

  async function flagLink(linkId: number) {
    try {
      const res = await fetch(`/api/community-links/${linkId}/flag`, { method: "POST" });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Could not flag link.");
        return;
      }
      toast.success("Link reported.");
      await refetchCommunityLinks();
    } catch {
      toast.error("Could not flag link.");
    }
  }

  function handleStarChange(rating: number) {
    setCurrentRating(rating);
    saveRating(rating);
    posthog.capture(EVENTS.MOVIE_RATED, { tmdbId: item.tmdbId, title: item.title, rating });
  }

  function handleNotesBlur() {
    if (currentRating > 0 && notes) saveRating(currentRating, notes);
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent
        className="flex max-h-[90vh] max-w-md flex-col overflow-hidden border-border bg-card p-0"
        aria-label={`Details for ${item.title}`}
      >
        {/* Poster + overlay — fixed, does not scroll */}
        <div className="relative aspect-[16/9] w-full flex-shrink-0 bg-muted">
          {item.posterUrl && (
            <Image
              src={item.posterUrl}
              alt={`Movie poster for ${item.title} (${item.year})`}
              fill
              className="object-cover object-center"
              unoptimized
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
          <RibbonBadge ribbon={item.ribbon} />
          <div className="absolute bottom-3 left-3 right-3">
            <h2 className="text-lg font-bold leading-tight">{item.title}</h2>
            <p className="text-sm text-muted-foreground">{item.year} · {item.originalLanguage.toUpperCase()}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto p-4 space-y-4">
          {/* Scores */}
          <div className="flex flex-col items-center gap-2">
            <CinemaScoreBadge score={item.cinemaScore} tooltip={item.scoreTooltip} />
            <ThreeScoreRow
              criticsScore={item.criticsScore}
              audienceScore={item.audienceScore}
              voteCount={item.voteCount}
              userRating={userRating}
              size="md"
            />
          </div>

          {/* Description: prefer personalized synopsis, fall back to overview */}
          {item.whyYoullLikeThis ? (
            <blockquote className="border-l-2 border-primary pl-3 text-sm text-muted-foreground italic">
              &ldquo;{item.whyYoullLikeThis}&rdquo;
            </blockquote>
          ) : (
            <p className="text-sm text-muted-foreground line-clamp-3">{item.overview}</p>
          )}

          {/* Franchise watch order — movies only (TMDB has no TV collections) */}
          {item.tmdbType === "movie" && (
            <FranchiseSection tmdbId={item.tmdbId} currentTmdbId={item.tmdbId} />
          )}

          {/* Platforms + Watch button */}
          {item.platforms.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Available on:</p>
              <div className="flex flex-wrap gap-1.5">
                {item.platforms.map((p) => (
                  <a
                    key={p}
                    href={getWatchUrl(p, item.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-foreground hover:bg-muted transition-colors"
                  >
                    {p}
                  </a>
                ))}
              </div>
              <a
                href={getWatchUrl(item.platforms[0], item.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Watch on {item.platforms[0]}
              </a>
              <p className="text-[10px] text-muted-foreground/60">
                Some links are affiliate links — we may earn a small commission at no extra cost to you.
              </p>
            </div>
          )}

          {/* Platform suggestion */}
          {!showSuggestPlatform ? (
            <p className="text-[10px] text-muted-foreground/60">
              Missing a free platform?{" "}
              <button
                type="button"
                onClick={() => setShowSuggestPlatform(true)}
                className="underline hover:text-foreground transition-colors"
              >
                Suggest it →
              </button>
            </p>
          ) : (
            <SuggestPlatformForm
              onSubmitted={() => setShowSuggestPlatform(false)}
              onCancel={() => setShowSuggestPlatform(false)}
            />
          )}

          {/* Community free links */}
          {communityLinks !== null && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground">Free to watch:</p>
              {communityLinks.length > 0 ? (
                <ul className="space-y-1.5">
                  {communityLinks.map((link) => (
                    <li key={link.id} className="flex items-center gap-1.5">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 truncate rounded-full bg-secondary px-2.5 py-0.5 text-xs text-foreground hover:bg-muted transition-colors"
                      >
                        {link.label ?? link.domain}
                      </a>
                      <button
                        type="button"
                        onClick={() => flagLink(link.id)}
                        className="flex-shrink-0 rounded p-0.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                        aria-label="Report this link"
                        title="Report link"
                      >
                        <Flag className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground/60">
                  Know where to watch this for free?{" "}
                  <button
                    type="button"
                    className="underline hover:text-foreground transition-colors"
                    onClick={() => setShowSubmitForm(true)}
                  >
                    Add a link.
                  </button>
                </p>
              )}
              {!showSubmitForm && communityLinks.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSubmitForm(true)}
                  className="text-xs text-muted-foreground/60 underline hover:text-foreground transition-colors"
                >
                  + Add a free link
                </button>
              )}
              {showSubmitForm && (
                <CommunityLinkSubmitForm
                  tmdbId={item.tmdbId}
                  tmdbType={item.tmdbType}
                  mediaTitle={item.title}
                  onSubmitted={async () => {
                    setShowSubmitForm(false);
                    await refetchCommunityLinks();
                  }}
                  onCancel={() => setShowSubmitForm(false)}
                />
              )}
            </div>
          )}

          {/* Rate */}
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-sm font-medium">Your rating</p>
            <StarRating value={currentRating} onChange={handleStarChange} size="md" />
            {currentRating > 0 && (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Notes (optional) — I loved it because..."
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary resize-none"
                rows={2}
                aria-label="Rating notes"
              />
            )}
            {saving && <p className="text-xs text-muted-foreground">Saving…</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                posthog.capture(EVENTS.WATCHLIST_TOGGLED, { tmdbId: item.tmdbId, title: item.title, action: inWatchlist ? "removed" : "added" });
                onWatchlist();
              }}
              className="flex-1 border-border"
              aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
            >
              {inWatchlist
                ? <><BookmarkCheck className="h-4 w-4 mr-1 text-primary" aria-hidden="true" /> Saved</>
                : <><Bookmark className="h-4 w-4 mr-1" aria-hidden="true" /> Save</>
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
