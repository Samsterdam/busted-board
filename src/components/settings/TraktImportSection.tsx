"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ImportResult {
  ratingsImported: number;
  ratingsSkipped: number;
  watchlistImported: number;
  watchlistSkipped: number;
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function TraktImportSection() {
  const [ratingsFile, setRatingsFile] = useState<File | null>(null);
  const [watchlistFile, setWatchlistFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const ratingsRef = useRef<HTMLInputElement>(null);
  const watchlistRef = useRef<HTMLInputElement>(null);

  async function handleImport() {
    if (!ratingsFile && !watchlistFile) {
      toast.error("Select at least one CSV file to import.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const [ratingsCsv, watchlistCsv] = await Promise.all([
        ratingsFile ? readFileAsText(ratingsFile) : Promise.resolve(undefined),
        watchlistFile ? readFileAsText(watchlistFile) : Promise.resolve(undefined),
      ]);

      const res = await fetch("/api/import/trakt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratingsCsv, watchlistCsv }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Import failed. Check the file format and try again.");
        return;
      }

      const data = await res.json() as ImportResult;
      setResult(data);

      const total = data.ratingsImported + data.watchlistImported;
      if (total > 0) {
        toast.success(`Imported ${total} item${total === 1 ? "" : "s"} from Trakt!`);
      } else {
        toast.info("Nothing new to import — all items already exist.");
      }
    } catch {
      toast.error("Could not read files. Make sure they are valid CSV files.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setRatingsFile(null);
    setWatchlistFile(null);
    setResult(null);
    if (ratingsRef.current) ratingsRef.current.value = "";
    if (watchlistRef.current) watchlistRef.current.value = "";
  }

  return (
    <section aria-labelledby="trakt-heading">
      <h2 id="trakt-heading" className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Import from Trakt
      </h2>
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div>
          <p className="text-sm font-medium mb-1">Bring your Trakt history over</p>
          <p className="text-xs text-muted-foreground">
            Export your data from{" "}
            <a
              href="https://trakt.tv/users/me/library"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              trakt.tv/users/me/library
            </a>
            {" "}(Settings → Export), then upload the CSV files below.
            Existing ratings won&rsquo;t be overwritten.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="trakt-ratings" className="text-xs font-medium text-muted-foreground block mb-1.5">
              Ratings CSV (optional)
            </label>
            <input
              id="trakt-ratings"
              ref={ratingsRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setRatingsFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted transition-colors"
            />
          </div>

          <div>
            <label htmlFor="trakt-watchlist" className="text-xs font-medium text-muted-foreground block mb-1.5">
              Watchlist CSV (optional)
            </label>
            <input
              id="trakt-watchlist"
              ref={watchlistRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setWatchlistFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted transition-colors"
            />
          </div>
        </div>

        {result && (
          <div className="rounded-lg bg-secondary/60 border border-border/50 p-3 space-y-1">
            <p className="text-xs font-medium text-foreground">Import complete</p>
            {result.ratingsImported > 0 && (
              <p className="text-xs text-muted-foreground">
                {result.ratingsImported} rating{result.ratingsImported === 1 ? "" : "s"} imported
                {result.ratingsSkipped > 0 ? `, ${result.ratingsSkipped} skipped` : ""}
              </p>
            )}
            {result.watchlistImported > 0 && (
              <p className="text-xs text-muted-foreground">
                {result.watchlistImported} watchlist item{result.watchlistImported === 1 ? "" : "s"} imported
                {result.watchlistSkipped > 0 ? `, ${result.watchlistSkipped} skipped` : ""}
              </p>
            )}
            {result.ratingsImported === 0 && result.watchlistImported === 0 && (
              <p className="text-xs text-muted-foreground">All items already existed — nothing new imported.</p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleImport}
            disabled={loading || (!ratingsFile && !watchlistFile)}
            className="flex-1 bg-primary text-primary-foreground"
          >
            {loading ? "Importing…" : "Import"}
          </Button>
          {(ratingsFile || watchlistFile || result) && (
            <Button variant="outline" onClick={handleReset} disabled={loading} className="border-border">
              Reset
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
