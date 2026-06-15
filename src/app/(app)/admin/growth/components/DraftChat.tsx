"use client";

import { useState, useRef, useEffect } from "react";

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
  onPosted: () => void;
  onClose: () => void;
}

export default function DraftChat({ opportunity: opp, onPosted, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const lastDraft = messages.findLast((m) => m.role === "model")?.content ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  async function postToReddit() {
    if (!lastDraft) return;
    setPosting(true);
    setPostError(null);
    try {
      const res = await fetch("/api/admin/growth/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: opp.id, text: lastDraft }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.error) throw new Error(data.error);
      onPosted();
    } catch (err) {
      setPostError(String(err));
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-zinc-800 pt-3">
      <div className="max-h-64 overflow-y-auto space-y-2 text-sm">
        {messages.length === 0 && (
          <p className="text-zinc-500 text-xs">
            Tell Gemini what angle you want — e.g. &ldquo;mention the Trakt price doubling, keep it
            casual&rdquo;
          </p>
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
          placeholder="Direction for Gemini…"
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
        <div className="flex gap-2 items-center">
          <button
            onClick={postToReddit}
            disabled={posting}
            className="text-xs px-3 py-1.5 rounded bg-green-700 hover:bg-green-600 text-white font-medium disabled:opacity-40"
          >
            {posting ? "Posting…" : "Post to Reddit"}
          </button>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          >
            Cancel
          </button>
          {postError && <span className="text-xs text-red-400">{postError}</span>}
        </div>
      )}
    </div>
  );
}
