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

No user data leaves Neon. TMDB and Gemini calls are server-to-server only
(API keys never reach the browser). Upstash only receives an IP-keyed counter
string — no PII.

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
  ├── 2. Build TMDB candidate buckets (parallel fetches)
  │       trending popular  ·  top rated  ·  upcoming  ·  classics
  │       (TV + movie for each bucket)
  │       Budget: 60 raw candidates checked for provider availability
  │
  ├── 3. Filter to on-platform titles
  │       mediaAvailability cache (24h TTL) → TMDB WatchProviders on miss
  │       Exclude: already rated · watchlisted · watched · dismissed
  │
  ├── 4. Rank via Gemini (top 30 candidates → ranked list)
  │       Prompt includes tasteProfile + vibeTags + candidate metadata
  │       Fallback: top-10 by TMDB popularity if Gemini returns nothing usable
  │
  ├── 5. Enrich: scores, ribbons, platform names  (scoresCache, mediaAvailability)
  │
  └── 6. Store in feedCache (JSON blob, keyed by userId)
           Served from cache on subsequent requests until invalidated
```

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
| Streaming providers | `mediaAvailability` (Neon) | 24 hours |
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
