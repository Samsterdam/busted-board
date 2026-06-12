import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts } from "@/lib/schema";
import { authConfig } from "@/auth.config";

// Full config = edge-safe base (providers/callbacks/pages) + the DB adapter.
// Used by route handlers and server components on the Node runtime. Middleware
// uses `authConfig` directly (without the adapter) so it stays edge-safe.
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, { usersTable: users, accountsTable: accounts }),
});
