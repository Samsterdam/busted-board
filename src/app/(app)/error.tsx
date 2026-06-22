"use client";

import { useEffect } from "react";
import Link from "next/link";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 pb-20 bg-background text-foreground">
      <p className="text-6xl font-bold text-muted-foreground/30 mb-4">!</p>
      <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
      <p className="text-sm text-muted-foreground mb-6">An unexpected error occurred.</p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
        <Link
          href="/feed"
          className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
        >
          Back to feed
        </Link>
      </div>
    </main>
  );
}
