import type { Metadata } from "next";
import Link from "next/link";
import { signIn } from "@/auth";
import { APP_URL } from "@/lib/config/app";

export const metadata: Metadata = {
  title: "Busted Board — Find Something Great to Watch",
  description:
    "Personalized movie and TV recommendations based on your taste, your platforms, and what you've actually seen.",
  openGraph: {
    title: "Busted Board",
    description: "Personalized movie & TV picks for what you can actually watch.",
    url: APP_URL,
    siteName: "Busted Board",
    images: [{ url: `${APP_URL}/opengraph-image` }],
  },
  twitter: { card: "summary_large_image" },
};

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "Sign-in is misconfigured. Please try again later.",
  AccessDenied: "Google sign-in was cancelled or denied. Please try again.",
  Verification: "That sign-in link has expired or was already used.",
  OAuthAccountNotLinked:
    "This email is already linked to a different sign-in method.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? "Something went wrong signing in. Please try again.")
    : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-10 py-12">
      {/* Hero */}
      <div className="text-center max-w-md">
        <h1 className="text-5xl font-bold text-primary mb-4">Busted Board</h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          Personalized movie and TV recommendations based on your actual taste —
          filtered to what you can watch right now.
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
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

      {/* Sign-in card */}
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 space-y-4">
        {errorMessage && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {errorMessage}
          </p>
        )}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 rounded-lg bg-white text-gray-800 font-medium py-2.5 px-4 hover:bg-gray-100 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        </form>
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-xs">
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
    </div>
  );
}
