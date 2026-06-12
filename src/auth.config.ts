import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe auth config: providers + callbacks only, NO database adapter.
 *
 * This is imported by `middleware.ts`, which runs on the Edge runtime. The
 * Drizzle adapter (and the Neon driver it pulls in) must NOT reach the edge
 * bundle — middleware only needs to verify the JWT cookie, not touch the DB.
 * The full config (this + the adapter) lives in `auth.ts` for Node route
 * handlers and server components.
 */
export const authConfig = {
  providers: [Google],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
