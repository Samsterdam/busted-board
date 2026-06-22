"use client";

import { useState, useRef, useEffect } from "react";
import { MS_PER_SECOND } from "@/lib/config/durations";

const COPY_FEEDBACK_MS = 2 * MS_PER_SECOND;

interface Opportunity {
  id: number;
  url: string;
  title: string | null;
  body: string | null;
  subreddit: string | null;
}

interface Message {
  role: "user" | "model";
  content: string;
}

interface Props {
  opportunity: Opportunity;
  onPosted?: () => void;
  onClose: () => void;
}

const AUTO_DRAFT_PROMPT =
  "Write a Reddit reply. Structure: (1) give specific, actionable advice about their actual problem — never say 'check the forums' or 'contact support', that's useless filler. Use what you know about the specific topic (Trakt, streaming services, etc). If you genuinely don't know the answer, say 'not sure on that one' briefly. (2) Disclose this is a bot reply from BustedBoardBot. (3) If relevant to streaming/tracking/discovery, mention Busted Board (busted-board.vercel.app) as a free alternative. " +
  "2-4 sentences total. No exclamation points. Casual tone. " +
  "If the post is about hardware/antennas/signal (not streaming apps), start with 'NOTE: not a Busted Board opportunity —' and skip the bot disclosure and promotion.";

export default function DraftChat({ opportunity: opp, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const didAutoDraft = useRef(false);

  const lastDraft = messages.findLast((m) => m.role === "model")?.content ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (didAutoDraft.current) return;
    didAutoDraft.current = true;
    const initial: Message[] = [{ role: "user", content: AUTO_DRAFT_PROMPT }];
    setMessages(initial);
    setLoading(true);
    fetch("/api/admin/growth/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunityId: opp.id, messages: initial }),
    })
      .then((r) => r.json())
      .then((data: { text?: string; error?: string }) => {
        if (data.error) throw new Error(data.error);
        setMessages([...initial, { role: "model", content: data.text ?? "" }]);
      })
      .catch((err: unknown) => {
        setMessages([...initial, { role: "model", content: `Error: ${String(err)}` }]);
      })
      .finally(() => setLoading(false));
  }, [opp.id]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/growth/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: opp.id, messages: next }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (data.error) throw new Error(data.error);
      setMessages([...next, { role: "model", content: data.text ?? "" }]);
    } catch (err) {
      setMessages([
        ...next,
        { role: "model", content: `Error: ${String(err)}` },
      ]);
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="space-y-3 border-t border-zinc-800 pt-3">
      <div className="max-h-64 overflow-y-auto space-y-2 text-sm">
        {loading && messages.length <= 1 && (
          <p className="text-zinc-500 text-xs animate-pulse">Auto-drafting…</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-zinc-300" : "text-white"}>
            <span className="text-xs text-zinc-500 mr-1">
              {m.role === "user" ? "You:" : "Gemini:"}
            </span>
            <span className="whitespace-pre-wrap">{m.content}</span>
          </div>
        ))}
        {loading && (
          <p className="text-zinc-500 text-xs animate-pulse">Drafting…</p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 text-sm bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          placeholder="Refine the draft…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="text-xs px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-white disabled:opacity-40"
        >
          Send
        </button>
      </div>

      {lastDraft && (
        <div className="flex gap-2 items-center flex-wrap">
          <button
            onClick={() => {
              navigator.clipboard.writeText(lastDraft).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
              }).catch(() => null);
            }}
            className="text-xs px-3 py-1.5 rounded bg-green-700 hover:bg-green-600 text-white font-medium"
          >
            {copied ? "Copied!" : "Copy draft"}
          </button>
          <a
            href={opp.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-white"
          >
            Open thread
          </a>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
