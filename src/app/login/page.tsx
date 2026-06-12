import { signIn } from "@/auth";

export const metadata = { title: "Sign In — Busted Board" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-6">
      <div className="text-center">
        <h1 className="text-4xl font-semibold text-primary mb-2">Busted Board</h1>
        <p className="text-muted-foreground text-sm">Find something great to watch.</p>
      </div>

      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 space-y-4">
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
    </div>
  );
}
