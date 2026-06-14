# Busted Board — System Architecture

## Overview

Busted Board is a personalized movie/TV recommendation app. Users rate titles,
the app builds a taste profile using Gemini, and serves a ranked feed of what
to watch next on the streaming services they subscribe to.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS · Drizzle ORM ·
Neon PostgreSQL · Upstash Redis · Vercel

---

## External Services

| Service | Role | Driver |
|---|---|---|
| **Vercel** | Hosting, CDN, Edge Network | — |
| **Neon PostgreSQL** | Primary data store (serverless, us-east-1) | `@neondatabase/serverless` |
| **Upstash Redis** | Rate-limit counters (sliding window, per-IP) | `@upstash/redis` |
| **TMDB API** | Movie/TV metadata, images, streaming providers | `fetch` (server-side) |
| **Google Gemini** | Taste-profile generation + feed ranking | `@google/generative-ai` |
| **Google OAuth** | Authentication (sole provider) | `next-auth` v5 |
| **Movie of the Night (MOTN)** | Pre-populated streaming catalog (11 platforms, up to 100 movies each) | `fetch` (server-side, admin sync only) |
| **Watchmode** | Pre-populated catalog for library/niche platforms (YouTube Free, Hoopla, Plex) | `fetch` (server-side, admin sync only) |

No user data leaves Neon. TMDB, MOTN, Watchmode, and Gemini calls are
server-to-server only (API keys never reach the browser). MOTN and Watchmode
are called only during admin catalog syncs — never on user requests. Upstash
only receives an IP-keyed counter string — no PII.

---

## Request Lifecycle

```
Browser
  │
  ▼
Vercel Edge Network
  │  (TLS termination, CDN)
  │
  ▼
proxy.ts  (Next.js Edge Middleware)
  ├── Matches all routes except /_next/static, /_next/image, favicon, manifest
  ├── Rate-limit check  ──► Upstash Redis  (sliding window, per-IP)
  │       /api/taste-profile/analyze  POST  →  10 req/hr
  │       /api/recommendations/feed   GET   →  30 req/hr
  │       /api/**                           →  300 req/hr
  │       Non-API / public routes           →  (skipped)
  ├── JWT verification  ──► HMAC-SHA256 cookie (NextAuth)
  │       Unauthenticated + protected   →  redirect /login
  │       Authenticated  + /login       →  redirect /
  └── Pass-through to route handlers
        │
        ├── /app/api/**  ──► Node.js API route handlers
        │       All DB access via Drizzle + Neon serverless driver
        │       Gemini calls from taste-profile/analyze and feed routes
        │       TMDB calls from tmdb/*, recommendations/*, quiz routes
        │
        └── /app/**  ──► React Server Components (SSR)
```

---

## Authentication Flow

```
User clicks "Sign in with Google"
  │
  ▼
NextAuth  →  Google OAuth consent screen
  │
  ▼
Google redirects to  /api/auth/callback/google
  │
  ▼
NextAuth creates / updates user row in Neon (DrizzleAdapter)
Sets HttpOnly JWT cookie (no DB session; strategy: "jwt")
  │
  ▼
proxy.ts verifies the JWT on every subsequent request
(edge-safe: no DB call, HMAC verification only)
```

The JWT carries only `id`, `name`, `email`, and `image`. The user's internal
UUID (`user.id`) is injected into the token in the `jwt` callback and surfaced
as `session.user.id` for server-side route handlers.

---

## Recommendation Engine Flow

```
buildFeed  (triggered on feed GET when cache is stale or empty)
  │
  ├── 1. Fetch user context from Neon
  │       ratings, watchlist, watched, dismissedItems,
  │       tasteProfile, vibeTags, userPlatforms
  │
  ├── 2. Catalog candidates — DB-only, no TMDB call
  │       queryCatalogCandidates() JOINs media → mediaLinks → platforms
  │       filtered to user's platform slugs + region
  │       Returns CatalogCandidate objects with platform names pre-resolved
  │       (populated by the admin sync-catalog job via MOTN + Watchmode)
  │
  ├── 3. Non-catalog TMDB buckets (parallel fetches)
  │       trending · hidden gems · classics · recent · on-platform discover
  │       Deduplicated against catalog set
  │       Budget: fills remaining slots up to FEED_PROVIDER_LOOKUP_LIMIT (60 total)
  │
  ├── 4. Provider lookup for non-catalog candidates only
  │       prefetchWatchProviders() → single DB SELECT for all candidates
  │       Cache hits return immediately (3-day TTL in mediaAvailability)
  │       Cache misses → getCachedWatchProviders() → TMDB WatchProviders → write-back
  │       Exclude: already rated · watchlisted · watched · dismissed
  │
  ├── 5. Rank via Gemini (top 30 on-platform candidates)
  │       Catalog movies sorted by MOTN rating (excluded from Gemini ranking)
  │       Non-catalog movies ranked by Gemini against tasteProfile + vibeTags
  │       Fallback: top-10 by vote_average if Gemini returns nothing usable
  │
  ├── 6. Enrich: scores, ribbons, platform names  (scoresCache)
  │
  └── 7. Store in feedCache (JSON blob, keyed by userId)
           Served from cache on subsequent requests until invalidated
```

Pagination (`buildMoreFeed`) follows the same catalog-bypass and batch-prefetch
pattern — catalog candidates lead, non-catalog candidates fill remaining slots.

Cache invalidation happens when the user rates a title, marks watched, adds to
watchlist, dismisses, or regenerates their taste profile.

---

## Database Schema Summary

| Table | Purpose |
|---|---|
| `user` | Auth identity (Auth.js required shape) |
| `account` | OAuth provider link (Google) |
| `ratings` | Star ratings (1–5); source: `user` \| `quiz` \| `quick` |
| `watchlist` | "Want to watch" bookmarks |
| `watched` | "Seen it" without a rating; feeds exclusion + taste profile |
| `dismissed_items` | Feed cards the user explicitly dismissed |
| `taste_profile` | Gemini-generated profile text fields per user |
| `vibe_tags` | User-entered mood/genre tags that influence feed |
| `user_platforms` | Streaming services the user subscribes to |
| `feed_cache` | Cached ranked feed JSON (one row per user) |
| `scores_cache` | Shared TMDB score cache (audience + critics) |
| `media_availability` | Shared streaming-provider JSON cache per (tmdbId, region) |
| `import_history` | Record of CSV import events |
| `media` | Normalized media entity (tmdbId + tmdbType key) |
| `platforms` | Streaming service registry |
| `media_links` | Relational: media ↔ platform ↔ region |

Ratings with `source = 'quiz'` or `'quick'` are excluded from the Watched tab
and stats chart but **do** feed the taste profile and recommendation exclusion
set — they are genuine preference signals.

---

## Caching Strategy

| Data | Cache | TTL / Invalidation |
|---|---|---|
| Feed recommendations | `feedCache` (Neon) | Invalidated on any user action (rate, watch, dismiss, profile regen) |
| Streaming providers | `mediaAvailability` (Neon) | 3 days |
| Scores (audience/critics) | `scoresCache` (Neon) | Read on miss; no explicit expiry (scores are slow-moving) |
| Rate-limit counters | Upstash Redis | 1-hour sliding window; auto-expires |

---

## Deployment

- **Platform:** Vercel (automatic from `master` branch)
- **Live URL:** `https://busted-board.vercel.app`
- **Region:** Vercel defaults; Neon and Upstash pinned to `us-east-1`
- **CI:** GitHub Actions — typecheck → lint → migration-drift → test → build
  → secret scan (gitleaks)
- **Environment variables:** set in Vercel project dashboard; see [ENV.md](ENV.md)
