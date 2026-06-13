/**
 * Single typed accessor for server-side secrets.
 *
 * App code reads secrets here instead of scattering `process.env.X` across
 * modules (AGENTS.md: "secrets … Access through a single typed config module").
 *
 * SERVER-ONLY — never import this from a client component; it would leak secrets
 * into the browser bundle. (Public `NEXT_PUBLIC_*` ad vars live in
 * `lib/ads/env.ts`, which must read them as literal member expressions so Next
 * can inline them client-side.)
 *
 * Required vars use `!` (asserted present at deploy time, as the call sites did
 * before); optional ones are typed `string | undefined` and consumers handle
 * absence.
 */
export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  TMDB_API_KEY: process.env.TMDB_API_KEY!,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
  /** Optional — score enrichment degrades gracefully when unset. */
  OMDB_API_KEY: process.env.OMDB_API_KEY,
} as const;
