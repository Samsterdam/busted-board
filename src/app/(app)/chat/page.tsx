"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Send } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CinemaScoreBadge } from "@/components/feed/ScoreDisplay";

interface SearchResult {
  tmdbId: number;
  tmdbType: string;
  title: string;
  year: string;
  posterUrl: string | null;
  platforms: string[];
  cinemaScore: number | null;
  overview: string;
}

interface Message {
  role: "user" | "assistant";
  text?: string;
  results?: SearchResult[];
  explanation?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const query = input.trim();
    if (!query || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: query }]);
    setLoading(true);

    try {
      const res = await fetch("/api/recommendations/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();

      setMessages((prev) => [...prev, {
        role: "assistant",
        explanation: data.explanation,
        results: data.results ?? [],
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        text: "Something went wrong. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell className="flex flex-col px-4 py-4">
      <h1 className="text-xl font-semibold mb-4">Find Something to Watch</h1>

      {/* Message history */}
      <div className="flex-1 space-y-4 min-h-0 overflow-y-auto" role="log" aria-label="Chat history" aria-live="polite">
        {messages.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm">Ask me anything, like:</p>
            <div className="mt-3 space-y-1 text-xs">
              {[
                "Something like Severance but funnier",
                "A scary movie under 2 hours",
                "Cozy movies for a rainy day",
                "Hidden gems from the 90s",
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setInput(s); }}
                  className="block mx-auto text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  &ldquo;{s}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "user" ? (
              <div className="rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-3 py-2 text-sm max-w-[80%]">
                {msg.text}
              </div>
            ) : (
              <div className="w-full space-y-3">
                {msg.explanation && (
                  <p className="text-sm text-muted-foreground">{msg.explanation}</p>
                )}
                {msg.text && (
                  <p className="text-sm text-destructive">{msg.text}</p>
                )}
                {msg.results && msg.results.length === 0 && (
                  <p className="text-sm text-muted-foreground">No results found. Try a different query.</p>
                )}
                {msg.results && msg.results.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="list" aria-label="Search results">
                    {msg.results.map((r) => (
                      <div
                        key={r.tmdbId}
                        className="rounded-xl border border-border bg-card overflow-hidden"
                        role="listitem"
                      >
                        <div className="relative aspect-[2/3] bg-muted">
                          {r.posterUrl && (
                            <Image
                              src={r.posterUrl}
                              alt={`Movie poster for ${r.title} (${r.year})`}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          )}
                        </div>
                        <div className="p-2 space-y-1">
                          <p className="text-xs font-medium line-clamp-1">{r.title}</p>
                          <p className="text-[10px] text-muted-foreground">{r.year}</p>
                          <div className="flex justify-center">
                            <CinemaScoreBadge score={r.cinemaScore} tooltip={[]} />
                          </div>
                          {r.platforms.length > 0 && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {r.platforms.slice(0, 2).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-xl bg-card border border-border px-4 py-3 text-sm text-muted-foreground">
              Searching…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-4 pt-2 border-t border-border">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask anything…"
          className="bg-secondary border-border"
          aria-label="Search query"
          disabled={loading}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="bg-primary text-primary-foreground"
          aria-label="Send"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </PageShell>
  );
}
