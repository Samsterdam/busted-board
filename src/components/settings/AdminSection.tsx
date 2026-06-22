"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MS_PER_DAY, MS_PER_HOUR } from "@/lib/config/durations";
import { CATALOG_MOTN_MONTHLY_BUDGET } from "@/lib/config/catalog";

type SyncType = "movie" | "tv";

interface SyncStatus {
  motnCallsThisMonth: number;
  motnMonthlyBudget: number;
  lastSynced: Record<string, { syncedAt: string; itemCount: number; callsUsed: number }>;
}

const HOURS_PER_DAY = MS_PER_DAY / MS_PER_HOUR;
const PERCENT_FULL = 100;

export function AdminSection() {
  const [syncing, setSyncing] = useState<SyncType | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  function loadSyncStatus() {
    const capturedNow = Date.now();
    fetch("/api/admin/sync-status")
      .then((r) => r.json())
      .then((d) => { setSyncStatus(d); setNowMs(capturedNow); })
      .catch(() => null);
  }

  useEffect(() => { loadSyncStatus(); }, []);

  // Aggregate per-platform log entries into a single summary for each media type.
  function getTypeStats(type: SyncType): { syncedAt: string; itemCount: number; callsUsed: number } | null {
    if (!syncStatus?.lastSynced) return null;
    const entries = Object.entries(syncStatus.lastSynced).filter(([k]) => k.endsWith(`:${type}`));
    if (entries.length === 0) return null;
    const latest = entries.reduce((a, b) =>
      new Date(a[1].syncedAt) > new Date(b[1].syncedAt) ? a : b
    );
    return {
      syncedAt: latest[1].syncedAt,
      itemCount: entries.reduce((s, [, v]) => s + v.itemCount, 0),
      callsUsed: entries.reduce((s, [, v]) => s + v.callsUsed, 0),
    };
  }

  function lastSyncedLabel(stats: ReturnType<typeof getTypeStats>): string {
    if (!stats) return "Never synced";
    const diff = nowMs - new Date(stats.syncedAt).getTime();
    const hours = Math.floor(diff / MS_PER_HOUR);
    if (hours < 1) return `Synced < 1 hour ago (${stats.itemCount} titles)`;
    if (hours < HOURS_PER_DAY) return `Synced ${hours}h ago (${stats.itemCount} titles)`;
    return `Synced ${Math.floor(hours / HOURS_PER_DAY)}d ago (${stats.itemCount} titles)`;
  }

  function isCoolingDown(stats: ReturnType<typeof getTypeStats>): boolean {
    if (!stats) return false;
    return nowMs - new Date(stats.syncedAt).getTime() < MS_PER_DAY;
  }

  const handleSyncCatalog = useCallback(async (type: SyncType) => {
    setSyncing(type);
    setSyncResult(null);
    try {
      const secret = process.env.NEXT_PUBLIC_CATALOG_SYNC_SECRET ?? "";
      const res = await fetch(`/api/admin/sync-catalog?type=${type}`, {
        method: "POST",
        headers: { "x-sync-secret": secret },
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Sync failed"); return; }
      const skipped = Object.values(data.platforms ?? {}).filter((p: unknown) => (p as { skipped: boolean }).skipped).length;
      const label = type === "movie" ? "movies" : "TV shows";
      const summary = `Synced ${data.synced} ${label}. ${data.callsUsed} API calls used.${skipped > 0 ? ` ${skipped} platforms skipped (cooldown or budget).` : ""}`;
      setSyncResult(summary);
      toast.success(`Synced ${data.synced} ${label}`);
      loadSyncStatus();
    } catch {
      toast.error("Catalog sync failed.");
    } finally {
      setSyncing(null);
    }
  }, []);

  return (
    <section aria-labelledby="admin-heading">
      <h2 id="admin-heading" className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Admin
      </h2>
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <Link
          href="/admin/growth"
          className="flex items-center justify-between rounded-lg border border-border/50 p-3 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          Growth Dashboard
          <span className="text-muted-foreground text-xs">→</span>
        </Link>

        <div>
          <p className="text-sm font-medium mb-2">Sync Streaming Catalog</p>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">MOTN API quota</span>
            <span className="tabular-nums text-muted-foreground">
              {syncStatus?.motnCallsThisMonth ?? "—"} / {syncStatus?.motnMonthlyBudget ?? CATALOG_MOTN_MONTHLY_BUDGET} calls this month
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: syncStatus ? `${Math.min(PERCENT_FULL, (syncStatus.motnCallsThisMonth / syncStatus.motnMonthlyBudget) * PERCENT_FULL)}%` : "0%" }}
            />
          </div>
        </div>

        {(["movie", "tv"] as const).map((type) => {
          const stats = getTypeStats(type);
          const cooling = isCoolingDown(stats);
          const label = type === "movie" ? "Movies" : "TV Shows";
          return (
            <div key={type} className="rounded-lg border border-border/50 p-3 space-y-2">
              <p className="text-xs font-medium">{label}</p>
              <div className="grid grid-cols-3 gap-1 text-[11px]">
                <div>
                  <p className="text-muted-foreground">Last sync</p>
                  <p className="font-medium">{stats ? lastSyncedLabel(stats).split(" (")[0] : "Never"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Titles</p>
                  <p className="font-medium tabular-nums">{stats?.itemCount ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">API calls</p>
                  <p className="font-medium tabular-nums">{stats?.callsUsed ?? "—"}</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={() => handleSyncCatalog(type)}
                disabled={syncing !== null || cooling}
                title={cooling ? "Wait 24h between syncs" : `~55 MOTN API calls`}
              >
                {syncing === type ? "Syncing…" : cooling ? `${label} (cooldown)` : `Sync ${label}`}
              </Button>
            </div>
          );
        })}

        {syncResult && <p className="text-xs text-green-400">{syncResult}</p>}
      </div>
    </section>
  );
}
