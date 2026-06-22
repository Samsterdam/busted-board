"use client";

import { useEffect, useState } from "react";
import {
  PlatformSuggestionCard,
  LinkSuggestionCard,
} from "./components/SuggestionCard";

const HTTP_FORBIDDEN = 403;

interface PlatformSuggestion {
  id: number;
  name: string;
  websiteUrl: string | null;
  notes: string | null;
  status: string;
  submitterEmail: string | null;
  submittedAt: string | null;
}

interface LinkSuggestion {
  id: number;
  tmdbId: number;
  tmdbType: string;
  mediaTitle: string | null;
  url: string;
  domain: string;
  label: string | null;
  status: string;
  submitterEmail: string | null;
  submittedAt: string | null;
}

type SuggestionType = "platform" | "link";
type SuggestionStatus = "pending" | "approved" | "rejected";

function groupByName(items: PlatformSuggestion[]): (PlatformSuggestion & { count: number })[] {
  const map = new Map<string, PlatformSuggestion & { count: number }>();
  for (const item of items) {
    const key = item.name.toLowerCase().trim();
    const existing = map.get(key);
    if (existing) {
      existing.count++;
    } else {
      map.set(key, { ...item, count: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export default function SuggestionsPage() {
  const [type, setType] = useState<SuggestionType>("platform");
  const [status, setStatus] = useState<SuggestionStatus>("pending");
  const [platforms, setPlatforms] = useState<PlatformSuggestion[]>([]);
  const [links, setLinks] = useState<LinkSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/suggestions?type=${type}&status=${status}`)
      .then((res) => {
        if (cancelled) return null;
        if (res.status === HTTP_FORBIDDEN) {
          setForbidden(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled || data === null) return;
        if (type === "platform") {
          setPlatforms(data as PlatformSuggestion[]);
        } else {
          setLinks(data as LinkSuggestion[]);
        }
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [type, status]);

  function handleStatusChange(id: number) {
    if (type === "platform") {
      setPlatforms((prev) => prev.filter((s) => s.id !== id));
    } else {
      setLinks((prev) => prev.filter((s) => s.id !== id));
    }
  }

  const types: SuggestionType[] = ["platform", "link"];
  const statuses: SuggestionStatus[] = ["pending", "approved", "rejected"];
  const groupedPlatforms = groupByName(platforms);

  if (forbidden) {
    return <p className="p-6 text-sm text-zinc-500">Access denied.</p>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Suggestions</h1>
          <a href="/admin/growth" className="text-xs text-zinc-500 hover:text-zinc-300 underline">
            ← Growth dashboard
          </a>
        </div>
      </div>

      <div className="flex gap-1 border-b border-zinc-800">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => { setType(t); setLoading(true); }}
            className={`text-sm px-4 py-2 capitalize ${
              type === t
                ? "text-white border-b-2 border-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t === "platform" ? "Platforms" : "Links"}
          </button>
        ))}
      </div>

      <div className="flex gap-1">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setLoading(true); }}
            className={`text-xs px-3 py-1 rounded-full capitalize ${
              status === s
                ? "bg-zinc-700 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading…</p>
      ) : type === "platform" ? (
        groupedPlatforms.length === 0 ? (
          <p className="text-zinc-500 text-sm">No {status} platform suggestions.</p>
        ) : (
          <div className="space-y-3">
            {groupedPlatforms.map((s) => (
              <PlatformSuggestionCard
                key={s.id}
                suggestion={s}
                onStatusChange={(id) => handleStatusChange(id)}
              />
            ))}
          </div>
        )
      ) : links.length === 0 ? (
        <p className="text-zinc-500 text-sm">No {status} link suggestions.</p>
      ) : (
        <div className="space-y-3">
          {links.map((s) => (
            <LinkSuggestionCard
              key={s.id}
              suggestion={s}
              onStatusChange={(id) => handleStatusChange(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
