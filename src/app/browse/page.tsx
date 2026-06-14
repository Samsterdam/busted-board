import { Suspense } from "react";
import Link from "next/link";
import { PublicMovieGrid } from "@/components/browse/PublicMovieGrid";
import { PLATFORM_REGISTRY } from "@/lib/platforms";

export const revalidate = 3600;

export const metadata = {
  title: "Browse Top Movies & TV — Busted Board",
  description: "Top-rated movies and TV shows available on streaming services right now. Find what to watch tonight.",
};

export default function BrowsePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">Busted Board</Link>
          <Link
            href="/login"
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* CTA */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-8 text-center">
          <p className="text-sm font-medium">Sign in for personalized picks on your platforms</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            AI-powered recommendations based on what you actually watch — not studio ads.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get personalized picks
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-2">Top Picks Right Now</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Highest-rated movies and shows available across all major streaming platforms.
        </p>

        {/* Platform nav */}
        <div className="flex gap-2 flex-wrap mb-6">
          {PLATFORM_REGISTRY.map((p) => (
            <Link
              key={p.slug}
              href={`/top/${p.slug}`}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium hover:bg-muted transition-colors"
            >
              {p.name}
            </Link>
          ))}
        </div>

        <Suspense fallback={<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">{Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-[2/3] rounded-lg bg-muted animate-pulse" />)}</div>}>
          <PublicMovieGrid />
        </Suspense>
      </main>
    </div>
  );
}
