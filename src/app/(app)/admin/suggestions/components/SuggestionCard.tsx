"use client";

import { useState } from "react";

interface PlatformSuggestion {
  id: number;
  name: string;
  websiteUrl: string | null;
  notes: string | null;
  status: string;
  submitterEmail: string | null;
  submittedAt: string | null;
  count?: number;
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

interface PlatformCardProps {
  suggestion: PlatformSuggestion;
  onStatusChange: (id: number, status: string) => void;
}

interface LinkCardProps {
  suggestion: LinkSuggestion;
  onStatusChange: (id: number, status: string) => void;
}

async function patchSuggestion(
  id: number,
  type: "platform" | "link",
  status: string,
  adminNotes?: string
): Promise<{ ok?: boolean; error?: string; message?: string }> {
  const res = await fetch("/api/admin/suggestions", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, type, status, adminNotes }),
  });
  return res.json() as Promise<{ ok?: boolean; error?: string; message?: string }>;
}

export function PlatformSuggestionCard({ suggestion: s, onStatusChange }: PlatformCardProps) {
  const [rejecting, setRejecting] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function approve() {
    setBusy(true);
    await patchSuggestion(s.id, "platform", "approved");
    onStatusChange(s.id, "approved");
  }

  async function confirmReject() {
    setBusy(true);
    await patchSuggestion(s.id, "platform", "rejected", adminNotes || undefined);
    onStatusChange(s.id, "rejected");
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <span>{s.submitterEmail ?? "unknown"}</span>
            <span>·</span>
            <span>{s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : "—"}</span>
            {s.count && s.count > 1 && (
              <>
                <span>·</span>
                <span className="text-amber-400 font-medium">{s.count} users suggested this</span>
              </>
            )}
          </div>
          <p className="text-sm font-medium text-white">{s.name}</p>
          {s.websiteUrl && (
            <a
              href={s.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-400 hover:text-zinc-200 underline break-all"
            >
              {s.websiteUrl}
            </a>
          )}
          {s.notes && (
            <p className="text-xs text-zinc-400 mt-1">{s.notes}</p>
          )}
        </div>
      </div>

      {!rejecting ? (
        <div className="flex gap-2">
          <button
            onClick={approve}
            disabled={busy}
            className="text-xs px-3 py-1.5 rounded bg-green-700 hover:bg-green-600 text-white font-medium disabled:opacity-40"
          >
            Approve
          </button>
          <button
            onClick={() => setRejecting(true)}
            disabled={busy}
            className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40"
          >
            Reject
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Rejection reason (optional, internal only)"
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white placeholder:text-zinc-500"
          />
          <div className="flex gap-2">
            <button
              onClick={confirmReject}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded bg-red-800 hover:bg-red-700 text-white font-medium disabled:opacity-40"
            >
              Confirm reject
            </button>
            <button
              onClick={() => setRejecting(false)}
              className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function LinkSuggestionCard({ suggestion: s, onStatusChange }: LinkCardProps) {
  const [rejecting, setRejecting] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function approve() {
    setBusy(true);
    const data = await patchSuggestion(s.id, "link", "approved");
    if (data.error === "cap_reached") {
      setFeedback(data.message ?? "Cap reached — remove an existing link first.");
      setBusy(false);
      return;
    }
    setFeedback("Promoted to community links.");
    onStatusChange(s.id, "approved");
  }

  async function confirmReject() {
    setBusy(true);
    await patchSuggestion(s.id, "link", "rejected", adminNotes || undefined);
    onStatusChange(s.id, "rejected");
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>{s.submitterEmail ?? "unknown"}</span>
          <span>·</span>
          <span>{s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : "—"}</span>
        </div>
        <p className="text-sm font-medium text-white">
          {s.mediaTitle ?? `${s.tmdbType} #${s.tmdbId}`}
        </p>
        <p className="text-xs text-zinc-500 font-mono">{s.domain}</p>
        <a
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-zinc-400 hover:text-zinc-200 underline break-all"
        >
          {s.url}
        </a>
        {s.label && (
          <p className="text-xs text-zinc-500">Label: {s.label}</p>
        )}
      </div>

      {feedback && <p className="text-xs text-amber-400">{feedback}</p>}

      {!rejecting ? (
        <div className="flex gap-2">
          <button
            onClick={approve}
            disabled={busy}
            className="text-xs px-3 py-1.5 rounded bg-green-700 hover:bg-green-600 text-white font-medium disabled:opacity-40"
          >
            Approve + promote
          </button>
          <button
            onClick={() => setRejecting(true)}
            disabled={busy}
            className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40"
          >
            Reject
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Rejection reason (optional, internal only)"
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white placeholder:text-zinc-500"
          />
          <div className="flex gap-2">
            <button
              onClick={confirmReject}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded bg-red-800 hover:bg-red-700 text-white font-medium disabled:opacity-40"
            >
              Confirm reject
            </button>
            <button
              onClick={() => setRejecting(false)}
              className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
