"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/PageShell";
import { posterUrl } from "@/lib/tmdb";
import { toast } from "sonner";
import { YEAR_PREFIX_LENGTH } from "@/lib/config/feed";
import { QUIZ_SIZE } from "@/lib/config/quiz";

interface QuizItem {
  id: number;
  type: "movie" | "tv";
  title: string;
  year: string;
  posterPath: string | null;
}

type Verdict = "like" | "dislike";
// Keyed on `${id}-${type}` — movies and TV shows share the TMDB numeric ID
// namespace, so a plain number key would collide across media types.
type AnswerMap = Record<string, { verdict: Verdict; item: QuizItem }>;

const SKELETON_COUNT = QUIZ_SIZE;

export default function QuizPage() {
  const router = useRouter();
  const [items, setItems] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/quiz")
      .then((r) => r.json())
      .then((data: { items?: QuizItem[] }) => setItems(data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  function vote(item: QuizItem, verdict: Verdict) {
    const key = `${item.id}-${item.type}`;
    setAnswers((prev) => {
      const next = { ...prev };
      if (next[key]?.verdict === verdict) {
        delete next[key];
      } else {
        next[key] = { verdict, item };
      }
      return next;
    });
  }

  async function handleSubmit() {
    const answerList = Object.values(answers);
    if (answerList.length === 0) return;
    setSubmitting(true);
    try {
      const body = {
        answers: answerList.map(({ verdict, item }) => ({
          tmdbId: item.id,
          tmdbType: item.type,
          title: item.title,
          posterPath: item.posterPath,
          verdict,
        })),
      };
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save answers.");
        return;
      }
      toast.success("Taste updated!");
      router.push("/");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <PageShell className="px-4 py-4">
        <h1 className="text-xl font-semibold mb-1">Taste Quiz</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Like or dislike to help us tune your recommendations.
        </p>
        <div className="space-y-3">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <div className="skeleton h-[60px] w-10 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3 w-2/3 rounded" />
                <div className="skeleton h-3 w-1/4 rounded" />
              </div>
            </div>
          ))}
        </div>
      </PageShell>
    );
  }

  if (items.length === 0) {
    return (
      <PageShell className="px-4 py-4">
        <h1 className="text-xl font-semibold mb-2">Taste Quiz</h1>
        <p className="text-sm text-muted-foreground mb-4">
          You&apos;ve already seen everything in the current quiz pool. Check back after more titles are trending.
        </p>
        <Button variant="ghost" onClick={() => router.back()}>← Go back</Button>
      </PageShell>
    );
  }

  const answerCount = Object.keys(answers).length;

  return (
    <PageShell className="px-4 py-4">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold">Taste Quiz</h1>
        <span className="text-xs text-muted-foreground">{answerCount} answered</span>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Like or dislike to help us tune your recommendations. Skip anything you haven&apos;t seen.
      </p>

      <div className="space-y-3 mb-6">
        {items.map((item) => {
          const imgSrc = posterUrl(item.posterPath, "w342");
          const current = answers[`${item.id}-${item.type}`]?.verdict;
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-secondary p-3"
            >
              {imgSrc ? (
                <Image
                  src={imgSrc}
                  alt={`Poster for ${item.title}`}
                  width={40}
                  height={60}
                  className="rounded-lg object-cover flex-shrink-0"
                  unoptimized
                />
              ) : (
                <div className="h-[60px] w-10 rounded-lg bg-muted flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.year.slice(0, YEAR_PREFIX_LENGTH)}{item.year ? " · " : ""}{item.type === "tv" ? "TV" : "Film"}
                </p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => vote(item, "like")}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                    current === "like"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label={`Like ${item.title}`}
                  aria-pressed={current === "like"}
                >
                  👍 Like
                </button>
                <button
                  type="button"
                  onClick={() => vote(item, "dislike")}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                    current === "dislike"
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label={`Dislike ${item.title}`}
                  aria-pressed={current === "dislike"}
                >
                  👎 Dislike
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={answerCount === 0 || submitting}
        className="w-full bg-primary text-primary-foreground"
      >
        {submitting ? "Saving…" : `Submit ${answerCount > 0 ? `(${answerCount})` : ""}`}
      </Button>
    </PageShell>
  );
}
