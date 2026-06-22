"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import posthog from "posthog-js";
import { EVENTS } from "@/lib/config/analytics";
import { parseLetterboxdRatings } from "@/lib/letterboxd-import";

interface ImportResult {
  ratingsImported: number;
  ratingsSkipped: number;
  ratingsNotFound: number;
  watchlistImported: number;
  watchlistSkipped: number;
  watchlistNotFound: number;
}

export function LetterboxdImportSection() {
  const ratingsRef = useRef<HTMLInputElement>(null);
  const watchlistRef = useRef<HTMLInputElement>(null);
  const [ratingsFile, setRatingsFile] = useState<File | null>(null);
  const [watchlistFile, setWatchlistFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleImport() {
    if (!ratingsFile && !watchlistFile) {
      toast.error("Select at least one CSV file to import.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const [ratingsCsv, watchlistCsv] = await Promise.all([
        ratingsFile ? ratingsFile.text() : Promise.resolve(undefined),
        watchlistFile ? watchlistFile.text() : Promise.resolve(undefined),
      ]);

      // Validate client-side before sending
      if (ratingsCsv) {
        const { rows } = parseLetterboxdRatings(ratingsCsv);
        if (rows.length === 0) {
          toast.error("No valid ratings found. Make sure this is a Letterboxd ratings.csv or watched.csv export.");
          setLoading(false);
          return;
        }
      }

      const res = await fetch("/api/import/letterboxd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratingsCsv, watchlistCsv }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Import failed.");
        return;
      }

      const data = await res.json() as ImportResult;
      setResult(data);
      const total = data.ratingsImported + data.watchlistImported;
      if (total > 0) {
        posthog.capture(EVENTS.IMPORT_COMPLETED, { source: "letterboxd", ratingsImported: data.ratingsImported, watchlistImported: data.watchlistImported });
        toast.success(`Imported ${total} item${total === 1 ? "" : "s"} from Letterboxd`);
      } else {
        toast.info("Nothing new to import — titles may not be in your streaming catalog yet.");
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
    <section aria-labelledby="letterboxd-heading">
      <h2 id="letterboxd-heading" className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Import from Letterboxd
      </h2>
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div>
          <p className="text-sm font-medium mb-1">Bring your Letterboxd history over</p>
          <p className="text-xs text-muted-foreground">
            Export your data from{" "}
            <a href="https://letterboxd.com/settings/data/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">
              letterboxd.com/settings/data
            </a>
            , then upload the CSVs below. Only movies already in your streaming catalog will be matched.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="lb-ratings" className="text-xs font-medium text-muted-foreground block mb-1.5">
              Ratings or Watched CSV (optional)
            </label>
            <input
              id="lb-ratings"
              ref={ratingsRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setRatingsFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted transition-colors"
            />
          </div>
          <div>
            <label htmlFor="lb-watchlist" className="text-xs font-medium text-muted-foreground block mb-1.5">
              Watchlist CSV (optional)
            </label>
            <input
              id="lb-watchlist"
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
                {result.ratingsNotFound > 0 ? `, ${result.ratingsNotFound} not in catalog` : ""}
              </p>
            )}
            {result.watchlistImported > 0 && (
              <p className="text-xs text-muted-foreground">
                {result.watchlistImported} watchlist item{result.watchlistImported === 1 ? "" : "s"} imported
                {result.watchlistSkipped > 0 ? `, ${result.watchlistSkipped} skipped` : ""}
                {result.watchlistNotFound > 0 ? `, ${result.watchlistNotFound} not in catalog` : ""}
              </p>
            )}
            {result.ratingsImported === 0 && result.watchlistImported === 0 && (
              <p className="text-xs text-muted-foreground">No matches found in your streaming catalog. Sync more platforms to improve coverage.</p>
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
