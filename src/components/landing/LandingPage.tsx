import Link from "next/link";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight">Busted Board</span>
          <Link
            href="/login"
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-16 flex flex-col items-center gap-10">
        {/* Hero */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-primary mb-4">
            Stop scrolling.<br />Start watching.
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
            Personalized picks filtered to what you can actually watch — not a popularity contest.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link
              href="/login"
              className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get personalized picks
            </Link>
            <Link
              href="/browse"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Browse without an account →
            </Link>
          </div>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="font-semibold mb-2">Pick your platforms</p>
            <p className="text-sm text-muted-foreground">
              Only see movies and shows available on the services you actually subscribe to.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="font-semibold mb-2">Rate what you know</p>
            <p className="text-sm text-muted-foreground">
              The more you rate, the smarter your feed gets. Skip what you haven&rsquo;t seen.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="font-semibold mb-2">Get your feed</p>
            <p className="text-sm text-muted-foreground">
              A personalized lineup that updates as your taste evolves — not a popularity contest.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center">
          Your taste profile and ratings are private to your account.
        </p>
        <p className="text-xs text-muted-foreground text-center">
          By signing in you agree to our{" "}
          <Link href="/terms" className="underline hover:text-foreground transition-colors">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
