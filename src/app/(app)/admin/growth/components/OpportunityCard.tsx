"use client";

import { useState } from "react";
import DraftChat from "./DraftChat";

interface Opportunity {
  id: number;
  platform: string;
  externalId: string;
  url: string;
  title: string | null;
  body: string | null;
  subreddit: string | null;
  author: string | null;
  score: number;
  status: string;
}

interface Props {
  opportunity: Opportunity;
  onStatusChange: (id: number, status: string) => void;
}

export default function OpportunityCard({ opportunity: opp, onStatusChange }: Props) {
  const [drafting, setDrafting] = useState(false);

  async function dismiss() {
    await fetch("/api/admin/growth/opportunities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: opp.id, status: "dismissed" }),
    });
    onStatusChange(opp.id, "dismissed");
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <span>r/{opp.subreddit}</span>
            <span>·</span>
            <span>u/{opp.author}</span>
            <span>·</span>
            <span>{opp.score} pts</span>
          </div>
          <a
            href={opp.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-white hover:text-zinc-300 line-clamp-2"
          >
            {opp.title}
          </a>
          {opp.body && (
            <p className="text-xs text-zinc-400 mt-1 line-clamp-3">{opp.body}</p>
          )}
        </div>
      </div>

      {!drafting ? (
        <div className="flex gap-2">
          <button
            onClick={() => setDrafting(true)}
            className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            Draft response
          </button>
          <button
            onClick={dismiss}
            className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          >
            Dismiss
          </button>
        </div>
      ) : (
        <DraftChat
          opportunity={opp}
          onPosted={() => onStatusChange(opp.id, "posted")}
          onClose={() => setDrafting(false)}
        />
      )}
    </div>
  );
}
