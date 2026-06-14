"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { PlatformPicker } from "@/components/onboarding/PlatformPicker";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { APP_URL, APP_SHARE_TEXT } from "@/lib/config/app";

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "IN", name: "India" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
];

export default function SettingsPage() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [country, setCountry] = useState("US");
  const [preferCaptions, setPreferCaptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/platforms").then((r) => r.json()),
      fetch("/api/user/preferences").then((r) => r.json()),
    ]).then(([platData, prefs]) => {
      setSelectedPlatforms((platData.selected ?? []).map((p: { slug: string }) => p.slug));
      setCountry(prefs.country ?? "US");
      setPreferCaptions(!!prefs.preferCaptions);
    }).catch(() => null).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await Promise.all([
        fetch("/api/platforms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platforms: selectedPlatforms }),
        }),
        fetch("/api/user/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country, preferCaptions }),
        }),
      ]);
      toast.success("Settings saved!");
    } catch {
      toast.error("Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Busted Board", text: APP_SHARE_TEXT, url: APP_URL });
      } else {
        await navigator.clipboard.writeText(APP_SHARE_TEXT);
        toast.success("Link copied to clipboard!");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error("Could not share.");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/user", { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await signOut({ callbackUrl: "/login" });
    } catch {
      toast.error("Could not delete account. Please try again.");
      setDeleting(false);
    }
  }

  if (loading) return <PageShell className="px-4 py-4"><div className="skeleton h-64 rounded-xl" /></PageShell>;

  return (
    <PageShell className="px-4 py-4">
      <h1 className="text-xl font-semibold mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Platforms */}
        <section aria-labelledby="platforms-heading">
          <h2 id="platforms-heading" className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            My Streaming Services
          </h2>
          <div className="rounded-xl border border-border bg-card p-4">
            <PlatformPicker selected={selectedPlatforms} onChange={setSelectedPlatforms} />
          </div>
        </section>

        {/* Region */}
        <section aria-labelledby="region-heading">
          <h2 id="region-heading" className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Region
          </h2>
          <div className="rounded-xl border border-border bg-card p-4">
            <label htmlFor="country" className="text-sm font-medium block mb-2">
              Your Country
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              Controls which streaming services and content are shown as available.
            </p>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
              aria-label="Select your country"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Accessibility */}
        <section aria-labelledby="accessibility-heading">
          <h2 id="accessibility-heading" className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Accessibility
          </h2>
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm font-medium">Prefer content with captions/subtitles</p>
                <p className="text-xs text-muted-foreground">
                  Prioritizes titles that are known to have CC or SDH subtitle support
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferCaptions}
                onClick={() => setPreferCaptions((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                  preferCaptions ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    preferCaptions ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </label>
          </div>
        </section>

        <Button
          onClick={save}
          disabled={saving}
          className="w-full bg-primary text-primary-foreground"
        >
          {saving ? "Saving…" : "Save Settings"}
        </Button>

        {/* Share */}
        <section aria-labelledby="share-heading">
          <h2 id="share-heading" className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Share
          </h2>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-medium mb-1">Invite a friend</p>
            <p className="text-xs text-muted-foreground mb-3">
              Share Busted Board with someone who&rsquo;s tired of scrolling for something to watch.
            </p>
            <Button variant="outline" className="w-full" onClick={handleShare}>
              Share Busted Board
            </Button>
          </div>
        </section>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-sm text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-primary"
        >
          Sign out
        </button>

        {/* Danger Zone */}
        <section aria-labelledby="danger-heading">
          <h2 id="danger-heading" className="text-sm font-medium text-destructive uppercase tracking-wider mb-3">
            Danger Zone
          </h2>
          <div className="rounded-xl border border-destructive/30 bg-card p-4">
            <p className="text-sm font-medium mb-1">Delete my account</p>
            <p className="text-xs text-muted-foreground mb-3">
              Permanently removes your account, ratings, watchlist, and all data. This cannot be undone.
            </p>
            <Dialog>
              <DialogTrigger
                render={
                  <Button variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/10" />
                }
              >
                Delete account
              </DialogTrigger>
              <DialogContent showCloseButton={false}>
                <DialogHeader>
                  <DialogTitle>Delete your account?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete your account, ratings, watchlist, watched history, and all associated data. This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                  <Button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? "Deleting…" : "Yes, delete everything"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground pt-2">
          <Link href="/privacy" className="underline hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          {" · "}
          <Link href="/terms" className="underline hover:text-foreground transition-colors">
            Terms of Service
          </Link>
        </p>
        <p className="text-center text-xs text-muted-foreground/50 pt-1">
          {process.env.NEXT_PUBLIC_BUILD_COMMIT} · {new Date(process.env.NEXT_PUBLIC_BUILD_DATE ?? "").toLocaleString()}
        </p>
      </div>
    </PageShell>
  );
}
