"use client";

import { useEffect, useState } from "react";
import OpportunityCard from "./components/OpportunityCard";

const HTTP_FORBIDDEN = 403;

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

type Tab = "pending" | "drafted" | "posted" | "dismissed";

export default function GrowthPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  // setLoading(true) lives in the tab-change handler so it never fires
  // synchronously inside the effect body (avoids cascading-render lint error).
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/growth/opportunities?status=${tab}`)
      .then((res) => {
        if (cancelled) return null;
        if (res.status === HTTP_FORBIDDEN) return Promise.resolve([] as Opportunity[]);
        return res.json() as Promise<Opportunity[]>;
      })
      .then((data) => {
        if (!cancelled && data !== null) {
          setItems(data);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tab]);

  function handleStatusChange(id: number, newStatus: string) {
    if (newStatus !== tab) {
      setItems((prev) => prev.filter((o) => o.id !== id));
    }
  }

  function switchTab(t: Tab) {
    setLoading(true);
    setTab(t);
  }

  async function triggerScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/admin/growth/scan", { method: "POST" });
      const data = (await res.json()) as { inserted?: number; skipped?: number; fetched?: number; error?: string; errors?: string[] };
      if (data.error) {
        setScanResult(`Error: ${data.error}`);
      } else {
        const errSuffix = data.errors?.length ? ` — ${data.errors.length} subreddit(s) failed: ${data.errors.join("; ")}` : "";
        setScanResult(`Scan done: ${data.inserted} new, ${data.skipped} skipped (${data.fetched ?? 0} fetched)${errSuffix}`);
        if ((data.inserted ?? 0) > 0 && tab === "pending") {
          setLoading(true);
          setTab("pending");
        }
      }
    } catch (err) {
      setScanResult(`Error: ${String(err)}`);
    } finally {
      setScanning(false);
    }
  }

  const tabs: Tab[] = ["pending", "drafted", "posted", "dismissed"];

  return (
    <div className="max-w-2xl mx-auto p-6 pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Growth Dashboard</h1>
          <p className="text-[11px] text-zinc-600 tabular-nums">{process.env.NEXT_PUBLIC_BUILD_COMMIT} · {new Date(process.env.NEXT_PUBLIC_BUILD_DATE ?? "").toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-3">
          {scanResult && (
            <span className="text-xs text-zinc-400">{scanResult}</span>
          )}
          <button
            onClick={triggerScan}
            disabled={scanning}
            className="text-xs px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-white disabled:opacity-40"
          >
            {scanning ? "Scanning…" : "Scan Reddit"}
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-zinc-800">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`text-sm px-4 py-2 capitalize ${
              tab === t
                ? "text-white border-b-2 border-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-zinc-500 text-sm">
          {tab === "pending"
            ? "No pending opportunities. Run a scan or wait for the daily cron."
            : `No ${tab} opportunities.`}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
