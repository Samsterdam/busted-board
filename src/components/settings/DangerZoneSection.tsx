"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
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

export function DangerZoneSection() {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  return (
    <section aria-label="Danger Zone">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="danger-panel"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between text-sm font-medium text-destructive uppercase tracking-wider mb-3 focus-visible:outline-2 focus-visible:outline-primary"
      >
        Danger Zone
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && <div id="danger-panel" className="rounded-xl border border-destructive/30 bg-card p-4">
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
      </div>}
    </section>
  );
}
