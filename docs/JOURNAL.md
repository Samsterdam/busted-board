# Busted Board — Project Journal

Most recent entry first. This is the source-of-truth status doc: what happened,
what's next, and any decisions made. Keep entries terse.

---

## 2026-06-14 (session 18b — image fix + feed preload)

### Done

- **Fixed broken movie images** — catalog movies (highest-priority feed bucket) had null `posterPath` in DB because MOTN doesn't return imageSet data; `posterUrl()` also mangled any full CDN URLs by prepending TMDB's image base.
  - `src/lib/tmdb.ts` — `posterUrl()` now passes through full `https://` URLs unchanged.
  - `src/lib/catalog-poster-warmup.ts` — new `warmupCatalogPosters()` batch-fetches TMDB `/movie/{id}` or `/tv/{id}` for every media row with null posterPath (20 concurrent, idempotent); called at end of each admin sync. All 1,482 rows now have posters.
  - `sync-catalog/route.ts` — `upsertMediaAndLink` no longer overwrites existing non-null posterPath with null on re-sync.
  - `src/lib/tmdb.ts` — added `fetchMovieDetails` and `fetchShowDetails`.
- **Fixed AdminSection sync status** — panel never loaded on mount (no `useEffect`) and looked up `"all:movie"` key that doesn't exist in the API response (per-platform keys like `"netflix:movie"`). Fixed both: added `useEffect` + `getTypeStats()` aggregation.
- **Feed preload — eliminate scroll-to-bottom spinner**:
  - `src/lib/feed-cache.ts` — upgraded to v2 multi-page envelope `{ v:2, pages: { "1": [...], "2": [...] } }` (no schema migration; old flat-array handled as page 1). New `readCachePages` / `writeCachePage` helpers with upsert safety.
  - `src/app/api/recommendations/feed/route.ts` — pages 2+ now served from cache on repeat visits; only calls `buildMoreFeed` on a true cache miss.
  - `src/components/feed/hooks/useFeedPagination.ts` — new hook extracted from `RecommendationFeed`; owns page/loadMore/sentinel/prefetch state. Background-prefetch fires immediately after page N renders (stores Promise in ref), `loadMore` consumes it instantly or falls back to direct fetch on error.
  - IntersectionObserver rootMargin bumped 200px → 600px (`FEED_SCROLL_PRELOAD_PX`).
  - `RecommendationFeed.tsx` shrank 517 → 434 lines.

### Next / open

- Run "Sync TV Shows" in Settings (TV catalog is still unpopulated).
- Vercel env vars still needed: see session 19 list.

---

## 2026-06-14 (session 20 — growth features: Trakt import, public browse, Stripe freemium, affiliate links, mobile fixes)

### Done

- **Competitive research** (103-agent deep research): confirmed JustWatch sold editorial independence for "Sponsored Recommendations," Trakt doubled prices ($30→$60/yr) triggering user exodus, and no single app offers cross-platform AI discovery. Busted Board's positioning: editorial independence + unified platform.
- **Settings page refactor**: split 387-line page into `AdminSection.tsx`, `DangerZoneSection.tsx` (extracted with own state); page now ~190 lines. Added `TraktImportSection` and `SubscriptionSection` to settings layout.
- **Trakt CSV import**:
  - `src/lib/trakt-import.ts` — CSV parser, Trakt 1-10 → our 1-5 scale, type mapping (Movie/Show)
  - `src/app/api/import/trakt/route.ts` — POST endpoint; batch-checks existing IDs before insert (idempotent, preserves existing ratings), logs to `importHistory`
  - `src/components/settings/TraktImportSection.tsx` — file upload UI, result summary card
- **Stripe freemium**:
  - `drizzle/0006_famous_luminals.sql` — subscriptions table (generated, **needs `npx drizzle-kit migrate`**)
  - `src/lib/config/stripe.ts` — `WATCHLIST_FREE_LIMIT = 50`, price ID constants
  - `src/lib/stripe-server.ts` — stripe client, `getSubscriptionStatus`, `getOrCreateStripeCustomer`, checkout/portal helpers
  - `src/app/api/billing/checkout/route.ts`, `portal/route.ts` — billing flow
  - `src/app/api/user/subscription/route.ts` — subscription status endpoint
  - `src/app/api/webhooks/stripe/route.ts` — webhook handler (checkout, subscription.updated, subscription.deleted); period end from `items.data[0].current_period_end` (newer Stripe API)
  - `src/app/api/watchlist/route.ts` — freemium gate: counts items before insert, 402 if free user ≥ 50
  - `src/components/settings/SubscriptionSection.tsx` — plan status display, upgrade/manage buttons
- **Public browse pages** (SEO):
  - `src/app/api/recommendations/public/browse/route.ts` — no auth, queries media+mediaLinks+platforms, optional platform filter, returns `PublicMediaItem[]`
  - `src/app/browse/page.tsx` — public `/browse` page (ISR 1h), CTA banner, platform nav chips
  - `src/app/top/[platform]/page.tsx` — `/top/[slug]` pages (ISR 1h), `generateStaticParams` for all 14 platforms
  - `src/components/browse/PublicMovieCard.tsx` + `PublicMovieGrid.tsx` — server components, no auth required
- **Affiliate links**:
  - `src/lib/config/affiliates.ts` — `getWatchUrl(platformName, title, deepLink?)`: Amazon Associates for Prime Video; platform homepages for others
  - `src/components/feed/MovieDetailModal.tsx` — platform badges now clickable links; added "Watch on [Platform]" primary button
- **Mobile fixes**:
  - Ad banner changed from `col-span-2` to `col-span-full` (was leaving a gap on 3-col mobile grid)
  - Card action buttons: `opacity-100 sm:opacity-0 sm:group-hover:opacity-100` — always visible on mobile, hover-only on desktop
- All changes: typecheck clean, ESLint clean, no file > 300 lines

### Needs before Stripe goes live

- Run `npx drizzle-kit migrate` against Neon (subscriptions table)
- Add env vars to Vercel: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Register Amazon Associates affiliate account → confirm `tag=bustedboard-20` is valid
- Set up Stripe products in dashboard (monthly $3, annual $25)
- Register Stripe webhook endpoint in dashboard pointing to `/api/webhooks/stripe`

### Next / open

- Post in r/trakt with Trakt import tool to capture user exodus cohort
- SEO: submit `/browse` and `/top/*` pages to Google Search Console
- Future: add `watchUrl` (MOTN deep links) to FeedItem → affiliate deep-link instead of search
- Future: add more affiliate programs (Hulu, Disney+, Paramount+ via Impact) after approval
- Future: "Leaving soon" alerts for watchlisted items (identified as high-demand feature by Trakt migrants)
- Future: Letterboxd CSV import (same pattern as Trakt, different column names)

---

## 2026-06-14 (session 19 — API call reduction, doc sync, deploy unblock)

### Done

- **TMDB watch-provider API call reduction** (70–90% in steady state):
  - `recommendation-engine.ts`: `queryCatalogCandidates()` now JOINs `platforms` and returns `CatalogCandidate[]` with platform data pre-resolved from DB — no TMDB call for catalog movies. Added `region` filter to the JOIN.
  - `availability.ts`: new `prefetchWatchProviders()` batch-fetches `mediaAvailability` for non-catalog candidates in one SELECT before the Promise.all loop.
  - `config/durations.ts`: `AVAILABILITY_CACHE_TTL_MS` raised 1d → 3d.
- **Documentation sync** — all docs updated to match current build:
  - `README.md`: replaced boilerplate with project description, stack, setup steps, links to docs
  - `ARCHITECTURE.md`: added MOTN/Watchmode to services table; rewrote recommendation engine flow; fixed TTL (24h→3d); updated privacy footnote
  - `ENV.md`: new "Optional — Catalog Sync" section (6 vars); `.env.local` template; Vercel checklist step 7
  - `API.md`: added 5 missing routes — `recommendations/search`, `recommendations/discovery`, `tmdb/search`, `tmdb/seed-movies`, `admin/sync-catalog`
- **Deploy unblocked**: ran migration 0005 against Neon; added `STREAMING_AVAILABILITY_API_KEY` to Vercel production; deployed; promoted.
- **Sync admin UI improvements**: quota progress bar, per-type stats grid (last sync, titles, API calls). `AdminSection` extracted to `src/components/settings/`.
- **Fix: zero TV shows on sync** — MOTN uses `"series/N"` as the TMDB ID prefix for TV, not `"tv/N"`. `parseTmdbId()` in `motn.ts` now accepts both.
- **Committed parallel session's work** — TV recommendations, Trakt import, Stripe billing foundation, public browse pages, settings component extraction, migration 0006 (subscriptions table). Fixed Stripe dahlia API version (`current_period_end` moved to `items.data[0]`), magic number lint errors throughout.

### Next / open

- Run migration 0006 against Neon: `node --env-file=.env.local node_modules/drizzle-kit/bin.cjs migrate`
- Run Sync TV Shows in Settings (MOTN series prefix fix is now deployed — should work)
- Add Stripe env vars to Vercel when ready to enable billing: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_ANNUAL_PRICE_ID`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Future: "Watch on [Platform]" deep-link button in `MovieDetailModal`
- Future: pre-warm `mediaAvailability` during catalog sync

---

## 2026-06-14 (session 18 — image fix)

### Done

- **Fixed broken movie images** — catalog movies dominating the feed had no poster paths, causing blank cards everywhere.
  - Root cause 1: `posterUrl()` in `src/lib/tmdb.ts` prepended TMDB's image base to MOTN's full CDN URLs, producing invalid compound URLs. Fixed with a `path.startsWith("http")` passthrough guard.
  - Root cause 2 (main): MOTN doesn't return `imageSet` data for most movies, so 772/875 catalog rows had `null` posterPath after the initial sync.
  - **Fix**: `src/lib/catalog-poster-warmup.ts` — new `warmupCatalogPosters()` batch-fetches TMDB `/movie/{id}` or `/tv/{id}` for every media row with null posterPath (20 concurrent, idempotent). Called at the end of each admin sync.
  - **Fix**: `upsertMediaAndLink` in `sync-catalog/route.ts` no longer overwrites an existing non-null posterPath with null (preserves TMDB paths across re-syncs).
  - `src/lib/tmdb.ts` — added `fetchMovieDetails` and `fetchShowDetails` for the warmup.

### Next / open

- **⚠ Run admin sync** to populate the ~772 missing poster paths now that `warmupCatalogPosters` is deployed. Settings → Admin → Sync Catalog (or POST `/api/admin/sync-catalog`).
- Add to Vercel env vars: `STREAMING_AVAILABILITY_API_KEY`, `WATCHMODE_API_KEY`, `CATALOG_SYNC_SECRET`, `ADMIN_EMAIL`, `NEXT_PUBLIC_SHOW_ADMIN=true`, `NEXT_PUBLIC_CATALOG_SYNC_SECRET`

---

## 2026-06-14 (session 17 — parallel: TV show support + sync hardening)

### Done

- **TV shows added to recommendation feed** — `buildFeed` and `buildMoreFeed` are no longer movie-only:
  - `src/lib/recommendation-engine.ts` — full refactor: adopted `DiscoverResult` discriminated union (`TmdbMovie | TmdbShow`) throughout; added 3 TV discovery buckets (acclaimed, trending, recent) each with `with_watch_providers` filter; `seen` Set now uses composite `"type:id"` keys to prevent movie/TV ID collisions; feed balance cap (max 40% TV via `CATALOG_TV_FEED_MAX_RATIO`); bingeable ribbon applied to highly-voted TV series; catalog candidates return `DiscoverResult`-shaped items for both types; `buildMoreFeed` expanded to 6 alternating movie/TV strategies
  - `src/lib/feed-enrichment.ts` — exported `titleOf()` and `releaseDateOf()` so the engine can reuse them
  - `src/components/feed/RecommendationCard.tsx` — small "TV" badge next to year for TV show cards
- **TV catalog sync** — MOTN and Watchmode clients extended to fetch series:
  - `src/lib/motn.ts` — `parseTmdbId` now handles both `"movie/N"` and `"tv/N"` formats; `fetchMoTNTitles(serviceId, country, showType, limit)` replaces `fetchMoTNMovies`; captures `seasonCount` and `episodeCount` from MOTN response
  - `src/lib/watchmode.ts` — `fetchWatchmodeTitles(sourceIds, mediaType, limit)` handles both movie and TV
  - Schema: `media` table gains `seasonCount`, `episodeCount`; new `catalogSyncLog` table tracks per-platform sync state
  - Migration `0005_plain_genesis.sql` applied to Neon DB
- **Sync hardening** (critical — protects 500/month MOTN budget):
  - `src/app/api/admin/sync-catalog/route.ts` — full rewrite: 24-hour cooldown per platform+type enforced via `catalogSyncLog`; monthly budget guard (`CATALOG_MOTN_SAFE_BUDGET = 450`); `?type=movie|tv|all` param (default=movie, safest); `?slug=X` for single-platform sync; skipped platforms reported in response with reason; `feedCache` cleared after sync
  - `src/app/api/admin/sync-status/route.ts` — new `GET` endpoint: last-synced timestamps per platform+type, MOTN calls used this month
  - `src/app/(app)/settings/page.tsx` — admin section redesigned: two separate buttons ("Sync Movies" / "Sync TV Shows"), cooldown display ("Synced Xh ago"), quota meter, both disabled during any in-flight sync
- **Config** — `src/lib/config/catalog.ts` gains `CATALOG_SHOWS_PER_PLATFORM`, `CATALOG_SYNC_COOLDOWN_MS`, `CATALOG_MOTN_MONTHLY_BUDGET`, `CATALOG_MOTN_SAFE_BUDGET`, `CATALOG_TV_FEED_MAX_RATIO`

### Next / open

- Run "Sync TV Shows" in Settings to populate TV catalog (~55 MOTN calls; 61 used so far of 500, resets 2026-07-01)
- Add Vercel env vars (same as session 16 list — these are not yet in production)
- Future: "Sync TV Shows" reveals what content is popular — use `seasonCount` for bingeable logic once data is populated
- Future: "Watch on [Platform]" deep-link button in `MovieDetailModal` using MOTN deep-link data

---

## 2026-06-14 (session 17 — streaming availability API call reduction)

### Done

- **Reduced TMDB watch-provider API calls 70–90%** across the feed pipeline via three changes:
  - **Strategy A (catalog bypass)** — `queryCatalogCandidates()` now JOINs `platforms` and returns `CatalogCandidate[]` with platform names/IDs pre-resolved from the DB. `buildFeed` and `buildMoreFeed` skip `getCachedWatchProviders` entirely for catalog movies; they already know their platforms. Also added `region` filter to the catalog JOIN (was previously unfiltered, could return movies from the wrong region).
  - **Strategy B (batch prefetch)** — new `prefetchWatchProviders()` in `src/lib/availability.ts` batch-fetches all `mediaAvailability` cache rows for non-catalog candidates in one `SELECT … WHERE tmdb_id IN (…)` query before the `Promise.all` loop. Warm-cache hits skip TMDB entirely; only genuine misses still call through.
  - **Strategy C (TTL extension)** — `AVAILABILITY_CACHE_TTL_MS` raised from 1 day → 3 days in `src/lib/config/durations.ts`. Streaming catalogs don't change hourly; 3-day freshness is fine for discovery.
- All changes: typecheck clean, ESLint clean (no magic numbers).

### Files changed

- `src/lib/config/durations.ts` — TTL bump
- `src/lib/availability.ts` — new `prefetchWatchProviders` export
- `src/lib/recommendation-engine.ts` — `CatalogCandidate` type, updated `queryCatalogCandidates`, both feed functions refactored

### Next / open

- Add to Vercel env vars: `STREAMING_AVAILABILITY_API_KEY`, `WATCHMODE_API_KEY`, `CATALOG_SYNC_SECRET`, `ADMIN_EMAIL`, `NEXT_PUBLIC_SHOW_ADMIN=true`, `NEXT_PUBLIC_CATALOG_SYNC_SECRET`
- Test the Settings → Admin → "Sync Catalog" UI button after deploying
- Re-sync as needed; 439/500 MOTN quota remains (resets 2026-07-01)
- Future: add `watchUrl` (deep link) using MOTN's deep link data; "Watch on [Platform]" button in `MovieDetailModal`
- Future: pre-warm `mediaAvailability` during catalog sync (the final piece for zero cold-start TMDB calls)

---

## 2026-06-14 (session 16 — parallel: provider ID fixes + catalog integration)

### Done

- **Fixed wrong TMDB provider IDs** in `src/lib/platforms.ts` — verified against live TMDB API:
  - Prime Video: 119 → 9 (119 not in US provider list at all)
  - Paramount+: 531 → 2616 (Essential tier; 531 not in US provider list)
  - Tubi: 257 → 73 (257 is fuboTV!)
  - YouTube (Free): 192 → 235 (192 is generic/paid YouTube)
  - Removed Showtime (folded into Paramount+ on TMDB, not a US provider)
  - Removed Crackle (TMDB ID 25 is Fandor; Crackle has no TMDB US entry)
- **Deep research** on streaming availability data sources (103 agents, 21 sources): confirmed no official platform APIs exist; Watchmode (279 providers, 2,500 free req/month) and Movie of the Night / Streaming Availability API (2,191 catalogs, 200k+ titles) are the two viable commercial options; TMDB is a once-daily JustWatch export with 32+ hr staleness.
- **Dual-source platform catalog** — Movie of the Night (MOTN) + Watchmode pre-populate our DB so the recommendation engine never makes per-request external API calls for discovery:
  - `src/lib/env.ts` — added `STREAMING_AVAILABILITY_API_KEY`, `WATCHMODE_API_KEY`, `CATALOG_SYNC_SECRET`, `ADMIN_EMAIL`
  - `src/lib/schema.ts` — extended `media` table (`overview`, `originalLanguage`, `motnRating`, `syncedAt`); extended `platforms` table (`motnServiceId`, `watchmodeSourceId`)
  - `drizzle/migrations/0004_jazzy_warpath.sql` — generated and applied to Neon DB
  - `src/lib/config/catalog.ts` — MOTN/Watchmode service ID maps, sync limits, constants
  - `src/lib/motn.ts` — Movie of the Night client with budget-safe pagination
  - `src/lib/watchmode.ts` — Watchmode client
  - `src/app/api/admin/sync-catalog/route.ts` — POST endpoint; fans out all platforms in parallel, delete-then-insert `mediaLinks` (removes departed titles), clears `feedCache` after sync; gated by `ADMIN_EMAIL` + `CATALOG_SYNC_SECRET` header
  - `src/lib/recommendation-engine.ts` — `queryCatalogCandidates()` queries `media → mediaLinks → platforms`; added as highest-priority bucket in both `buildFeed` and `buildMoreFeed`; catalog movies skip Gemini ranking (use `motnRating` order instead), avoiding `popularity` distortion
  - `src/app/api/recommendations/feed/route.ts` — passes `platformSlugs` to both build functions
  - `src/app/(app)/settings/page.tsx` — "Sync Catalog" admin button (visible when `NEXT_PUBLIC_SHOW_ADMIN=true`)
- **Initial sync completed** (local, directly against Neon DB): 1,250 movies across 14 platforms — 11 via MOTN × 100 movies each, 3 via Watchmode × 50 each. **61/500 MOTN quota used** (resets 2026-07-01). Catalog includes The Dark Knight on Roku, The Godfather on Pluto, The Matrix on YouTube Free, The Silence of the Lambs on Tubi, etc.
- **Division of labor**: MOTN covers mainstream paid + AVOD (Netflix, Prime, Disney, Max, Hulu, Apple, Roku, Peacock, Paramount, Tubi, Pluto); Watchmode covers library/niche (YouTube Free, Hoopla, Plex). Kanopy not tracked by either.

### Next / open

- Add to Vercel env vars: `STREAMING_AVAILABILITY_API_KEY`, `WATCHMODE_API_KEY`, `CATALOG_SYNC_SECRET`, `ADMIN_EMAIL`, `NEXT_PUBLIC_SHOW_ADMIN=true`, `NEXT_PUBLIC_CATALOG_SYNC_SECRET`
- Test the Settings → Admin → "Sync Catalog" UI button after deploying
- Re-sync as needed; 439/500 MOTN quota remains for July (budget allows ~6 more full syncs this month)
- Future: add `watchUrl` (deep link) to `FeedItem` using MOTN's deep link data; add "Watch on [Platform]" button in `MovieDetailModal`
- Future: multi-platform availability badge on cards ("Also on Tubi, Pluto")

---

## 2026-06-14 (session 16)

### Done

- **Cross-platform discovery section**: "Expand your lineup" section below the main feed shows top-rated content available on streaming services the user *doesn't* have yet.
  - `src/lib/discovery-engine.ts` — `buildDiscoveryItems(userId, platformTmdbIds, region)`: 2 TMDB buckets (top-rated + popular), excludes rated/watched/dismissed/watchlisted, **excludes items accessible on any user-owned platform** (correctness fix: multi-platform items like Netflix+Hulu don't bleed through if user has Hulu), returns up to 8 `FeedItem[]` with `platforms` = the non-user provider names.
  - `src/app/api/recommendations/discovery/route.ts` — `GET /api/recommendations/discovery`, uncached (provider data has its own DB cache via `getCachedWatchProviders`).
  - `src/components/feed/hooks/useDiscovery.ts` — lazy-loads discovery after main feed renders so it never blocks page load.
  - `src/components/feed/PlatformFilter.tsx` — extracted from inline JSX in `RecommendationFeed.tsx`.
  - `src/components/feed/ResultsSection.tsx` — reusable grid section with heading/subtitle; used for both "More like this" and discovery. Supports `platformLabels` prop to render the platform name above each card.
  - `src/components/feed/RecommendationFeed.tsx` — all four mutation handlers (dismiss, watchlist, watched, thumbsUp) now also clear from `discovery` state.
  - `src/lib/config/feed.ts` — 4 new discovery constants.

### Next / open

- Apply for affiliate programs (JustWatch publisher, Amazon Associates, or per-platform via CJ/Impact) — add watch-now links once accounts are set up.
- Affiliate links groundwork: add `watchUrl?: string` to `FeedItem` and "Watch on [Platform]" button in `MovieDetailModal`.
- Google OAuth app verification (Google Cloud Console → OAuth consent screen → Submit for verification).
- OWASP ZAP scan against live site.

---

## 2026-06-14 (session 15)

### Done

- **Feed initial-load flash fixed**: Restructured `RecommendationFeed` so the header, search bar, and platform chips always render from the very first SSR — only the grid area skeletons while feed data loads. Previously the whole UI was replaced by `FeedSkeleton`, causing the search bar and chips to pop in after the API call completed (looked like an ad slot loading).
- **Search restored**: Recreated `POST /api/recommendations/search` (deleted in session 10). Simple TMDB `searchMulti` — returns title/poster/year/overview for top 8 results, no AI, no platform lookups. `similar: []`, `explanation` = `Results for "{query}"`.
- **`(app)/loading.tsx` updated**: Now shows 3 header buttons + search bar skeleton + platform chips + 3-column grid — matches the new `RecommendationFeed` initial render.
- **`FeedSkeleton` → `GridSkeleton`** in `FeedStates.tsx`: takes a `gridClass` prop, renders only the card grid (no full-page wrapper). Lint + types clean.

### Next / open

- (carry forward from session 13/14)

---

## 2026-06-14 (session 14)

### Done

- **Documentation suite** — four new docs written from verified source code:
  - `docs/ARCHITECTURE.md` — system overview, external services, request lifecycle, recommendation engine flow, DB schema summary, caching strategy, deployment
  - `docs/SECURITY.md` — auth model (Google OAuth + JWT), authorization (per-user isolation), rate limiting (Upstash tiers), HTTP security headers, secret management, vulnerability scanning, data privacy, known gaps
  - `docs/API.md` — full route reference with auth requirements, rate limits, request/response shapes, and notable behaviors (all claims verified against source)
  - `docs/ENV.md` — environment variables reference with source links, optional vs required, Vercel setup checklist, local template

### Next / open

- (carry forward from session 13 — see below)

---

## 2026-06-14 (session 13)

### Done

- **Security hardening** (headers + rate limiting):
  - Security headers added to `next.config.ts`: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `HSTS` (2yr), `Permissions-Policy` — applied to all routes.
  - Rate limiting via Upstash Redis in `proxy.ts`: 10 req/hr on taste-profile/analyze, 30/hr on feed, 300/hr general API, per IP. Gracefully skips when Upstash env vars absent (local dev). Upstash database created at us-east-1; keys added to Vercel env vars.
  - Snyk GitHub integration connected; one finding (postcss XSS, build-only, ignored).
  - Probely/Snyk ownership meta tag added to `layout.tsx`.
- **Launch readiness** (commit `804ce56`):
  - **Quiz TV shows**: GET now fetches trending + acclaimed TV alongside movies (4 parallel buckets); interleaves results so both types appear within QUIZ_SIZE. Fixes known-set collision bug (was `Set<number>` — movies and TV share numeric IDs; changed to composite `${tmdbId}-${type}` string key). `QuizItem.type` widened to `"movie" | "tv"`; `AnswerMap` key changed from `number` to `string`. Film/TV label added in quiz card.
  - **Engine split**: `FeedItem`, `DiscoverResult`, `enrichToFeedItems` extracted to `src/lib/feed-enrichment.ts`; `recommendation-engine.ts` reduced to ~220 lines (build functions only). Re-exports backward-compat for 5 component importers. `browse/route.ts` import updated.
  - **`middleware.ts` → `proxy.ts`**: renamed per Next.js 16.x deprecation.
  - **`SurpriseView.tsx`**: ternary-as-statement lint error fixed.
- **Divergence note documented**: `enrichToFeedItems` (browse/search, mixed movie+TV `DiscoverResult[]`) vs inline enrichment in `buildFeed` (movie-only, optimised for ranked feed) — intentional split, comment in both files.

### Next / open (manual — Sam only)

- ~~Delete 3 quiz-generated watched entries~~ — done.
- Google OAuth app verification (Google Cloud Console → OAuth consent screen → Submit for verification) — removes "unverified app" warning.
- OWASP ZAP scan against live site — run after current deploy goes green.
- Verify current Vercel deploy (`804ce56`) green, then recheck securityheaders.com.

---

## 2026-06-14 (session 13 — prior content)
- **Surprise Me follow-up** (commit `bffd315`):
  - Replaced single-card view with 3-card `RecommendationCard` layout
  - Reshuffle cycles through pool of 9; exhausted pool re-fetches from new `/api/recommendations/surprise` endpoint
  - Mood filter (8 genre chips) appears after 2 reshuffles — restricted to movie+TV genre intersection to prevent silent TV genre mismatch
  - Dismiss/watched/thumbs-up remove cards from pool optimistically
  - Empty state with contextual CTA
  - `page.tsx` converted to server component with platform guard
- **Bingeable ribbon** (global): `📺 Bingeable` in `RibbonBadge` + logic in `feed-enrichment.ts`'s `enrichToFeedItems` — TV shows with `voteCount >= 500` and no existing ribbon; lowest priority

### Next / open
- **Bingeable series preference**: "Input series I've loved → find similar ones" — deferred, needs its own plan
- **Google OAuth app verification**: submit in Google Cloud Console to remove unverified-app warning for new users

---

## 2026-06-14 (session 12)

### Done
- **Multi-user readiness shipped**: onboarding gate, landing page redesign, OG image, account deletion, share button, bingeable constants exported — all committed and pushed. Migration `0003_burly_bushwacker.sql` applied to production Neon DB and stamped in `drizzle.__drizzle_migrations`. Google Cloud OAuth branding filled in (app name, homepage, privacy/terms URLs).
- **Removed chat/AI search**: nav item, page, API route, and `interpretSearchQuery` from `gemini.ts` all deleted.
- **Reviewed Surprise Me page** (built in session 11 by a parallel session): 1-card detail view with poster, scores, whyYoullLikeThis, overview, platforms, inline rating, watchlist/seen buttons. Uses existing personalized feed pool.

### Next / open
- **Surprise Me follow-up** (approved plan in `.claude/plans/and-we-make-a-robust-petal.md`):
  - Switch to 3-card layout
  - Mood filter ("What are you in the mood for?") appears after 2 reshuffles — genre chips (intersection of movie + TV genre maps only: Action, Animation, Comedy, Crime, Documentary, Drama, Mystery, Sci-Fi)
  - Bingeable ribbon on TV show cards globally (voteCount ≥ 500, lowest ribbon priority)
- **Bingeable series preference** (separate session): "Input series I've loved → find similar ones"
- **Contact email** in `/privacy` and `/terms` is a Google Form link (resolved)

---

## 2026-06-14 (session 11)

### Done

- **Fixed: quiz verdicts no longer appear in Watched tab** — added `source` column (`"user"` | `"quiz"`, default `"user"`) to the `ratings` table. Quiz POST inserts tag rows `source: "quiz"`; the Watched tab, ratings GET endpoint, and stats route all filter to `source = "user"`. Taste profile and recommendation engine exclusion still use all ratings (quiz verdicts are genuine signals). Migration `0003_burly_bushwacker.sql` generated and applied. New constants `RATING_SOURCE_USER`/`RATING_SOURCE_QUIZ` in `src/lib/config/ratings.ts`.
- **Fixed: watchlist items now excluded from feed** — recommendation engine (`buildFeed` + `buildMoreFeed`) now queries the `watchlist` table and adds those tmdbIds to the exclusion set. Also, bookmarking a card from the feed now removes it immediately (client-side optimistic removal in `RecommendationFeed.tsx`).
- **Surprise Me page** (`/surprise`) — new bottom-nav page (Shuffle icon) that fetches the personalized feed and picks a random unseen title. Full detail view: poster, CinemaScore + 3-score row, why-you'll-like-this, platforms, inline star rating, watchlist toggle, mark-as-seen. "Try Another" re-rolls from the in-memory pool instantly.
- **Quick thumbs-up button** — 4th hover button on feed cards (ThumbsUp icon, amber). One-tap positive signal: removes card from feed, stores `rating=5, source='quick'` (feeds taste profile + engine exclusion; excluded from Watched tab and stats chart). Ratings POST extended to accept `source: 'user' | 'quick'`. New constant `RATING_SOURCE_QUICK`.
- All changes pushed live to https://busted-board.vercel.app/.

### Next / open
- Carryover from prior sessions still open (see below).

---

## 2026-06-14 (session 10)

### Done
- **Removed Chat feature**: deleted `/chat` page + loading skeleton, `/api/recommendations/search` route, `interpretSearchQuery` from `gemini.ts`, and the Chat nav item from `BottomNav.tsx`. `SearchQueryInterpretation` type removed too. Lint clean.
- **Multi-user readiness** — full set of changes to make the app shareable:
  - **Onboarding gate** (`src/app/(app)/page.tsx`): zero platforms + zero ratings → `/setup`; zero platforms + has ratings → `/settings` (prevents replaying onboarding for established users who removed platforms)
  - **Setup guard** (`src/app/setup/page.tsx`): converted to server component; redirects to `/` if user already has platforms
  - **Landing/login redesign** (`src/app/login/page.tsx`): hero, 3 feature cards, sign-in card, ToS/Privacy footer. AccessDenied error copy fixed ("cancelled or denied" vs "no permission").
  - **OG metadata + image**: `metadataBase` set in root layout; login page exports full OG/Twitter metadata; `src/app/opengraph-image.tsx` generates branded 1200×630 card via `next/og`
  - **Share button** (`settings/page.tsx`): `navigator.share` with clipboard fallback; AbortError swallowed; placed after Save, before Sign Out
  - **Account deletion**: `DELETE /api/user` explicitly clears all 9 user data tables (only `accounts` cascades from `users`); danger zone in settings with Base UI Dialog confirmation; on success signs out to `/login`
  - **Constants**: `src/lib/config/app.ts` — `APP_URL` + `APP_SHARE_TEXT`
- Lint + build both clean.

### Next / open
- Contact email in `/privacy` and `/terms` is a `// TODO` placeholder — must be filled before going live.
- Google OAuth app verification (removes the "unverified app" warning for new users) — done in Google Cloud Console, not code.

---

## 2026-06-14 (session 9)

### Done

- **Legal pages**: added `LICENSE` (MIT, Sam Deiter 2026), `/privacy` (Privacy Policy), and `/terms` (Terms of Service) as static pages. Both cover GDPR rights, CCPA rights, Google OAuth data, app data (ratings/watchlist/dismissals), and the ad-consent cookie flow. Contact email is a `// TODO` placeholder — must be filled in before going live. Linked from login page ("By signing in…" footer) and settings page footer. Build passes, pages render as `○ Static`.

---

## 2026-06-14 (session 8)

### Done

- **Full security audit + fixes**: ran a multi-step audit covering auth, injection, key exposure, and abuse vectors. All confirmed findings addressed:
  - **HIGH fixed** — mass assignment IDOR in `PATCH /api/ratings/[id]`: replaced `{ ...body }` spread into Drizzle `.set()` with an explicit field allowlist (`rating`, `notes`, `watchStatus` only). An attacker could previously reassign their rating rows to any other user's account via `{"userId": "victim-id"}`.
  - Added `parseInt(id)` NaN guards to both DELETE and PATCH in same route (500 → 400 on non-numeric IDs).
  - Added runtime validation for `rating` range, `watchStatus` enum, and `notes` length.
  - **MEDIUM fixed** — `notes` and `title` length caps (500 / 200 chars) in ratings POST and quiz POST answers. Both fields feed Gemini prompts via `JSON.stringify`; unbounded strings inflate token costs.
  - **MEDIUM fixed** — auth guard added to `GET /api/tmdb/search` and `GET /api/tmdb/seed-movies` (both were fully unauthenticated, exposing the server's TMDB API key to unauthenticated callers; seed-movies fans out to 20+ calls per hit).
  - **MEDIUM fixed** — quiz POST: 50-answer cap, per-answer `tmdbType` enum validation (`"movie" | "tv"` only), per-answer `title` length filter.
  - **LOW fixed** — `GET /api/watched` and `GET /api/taste-profile/analyze` now return 401 (not 200 + empty data) for unauthenticated callers.
  - New constants in `src/lib/config/ratings.ts` (`NOTES_MAX_LENGTH`, `TITLE_MAX_LENGTH`, `VALID_WATCH_STATUSES`) and `src/lib/config/quiz.ts` (`QUIZ_MAX_ANSWERS`).
  - **Gemini API key**: no extraction path found — key is server-side only, never in prompts or responses.

### Next / open
- Carryover from prior sessions still open (see below).

---

## 2026-06-14 (session 7)

### Done

- **Removed chat and AI search features**: deleted `/chat` page + loading, `/api/recommendations/search` route, `interpretSearchQuery` from `gemini.ts`, and Chat entry from `BottomNav`. Committed `eea9cad`.
- **Fixed: dismissed and watched items now fully removed from all feed surfaces** (`dc7d0be`):
  - Dismiss route was not calling `invalidateFeedCache` — dismissed items could reappear on page reload for up to 12 hours (cache TTL). Fixed.
  - Browse page (`enrichToFeedItems`) had no dismiss/watch filtering — items dismissed from the feed still showed in Browse collections. Fixed by adding optional `userId` param that queries dismissed/watched and filters before provider lookups.
  - Added unique constraint on `dismissedItems(userId, tmdbId, tmdbType)` (matching `watched` table pattern) to prevent duplicate rows. Migration `0002_steady_squadron_sinister.sql` generated; constraint applied directly to DB.
  - Extracted `invalidateFeedCache` to `src/lib/feed-cache.ts` (shared utility, used by both watched and dismiss routes).

### Next / open
- Carryover from prior sessions still open (see below).

---

## 2026-06-14 (session 6)

### Done

- **Rating Breakdown chart on taste page**: new `/api/ratings/stats` route returns star distribution via `GROUP BY rating`; `RatingDistribution` component renders pure-CSS horizontal bars (no library); wired into `taste/page.tsx` as a 3rd parallel fetch. Committed `0783c0e`.
- **Confirmed**: `MovieDetailModal` already renders `whyYoullLikeThis` (line 109) — no changes needed there.

### Next / open
- Carryover from prior sessions still open (see below).

---

## 2026-06-14 (session 5)

### Done
- **Fixed card action button tooltips** (`RecommendationCard.tsx`): X / bookmark / eye buttons had `aria-label` but no visible tooltip on hover. Wrapped each in `Tooltip`/`TooltipTrigger`/`TooltipContent` (`side="left"`) using the existing Base UI pattern from `ScoreDisplay.tsx`. `TooltipProvider` already global in `layout.tsx` — no other changes needed.

### Next / open
- Carryover from prior sessions still open (see below).

---

## 2026-06-14 (session 4)

### Done
- **Fixed production site** (`https://busted-board.vercel.app`): `AUTH_URL` in Vercel env vars was set to `https://example.com` (cleared at some point), causing all visits to redirect to localhost. Reset to `https://busted-board.vercel.app` and redeployed — site is live and working.

### Next / open
- Carryover from session 3 still open (see below).

---

## 2026-06-14 (session 3)

### Done
- **Fixed free/AVOD platform feed starvation** (`recommendation-engine.ts`):
  - `buildFeed` was generating candidates from generic TMDB queries (trending, high-rated, recent) with no platform filter, then checking providers after the fact. For Roku Channel, Crackle, YouTube Free, etc. the overlap with generic "popular/highly-rated" movies was near-zero — users got 1–2 results.
  - Added a 5th parallel bucket using TMDB `with_watch_providers` + `watch_region` params (`vote_average.desc`, `vote_count.gte: 50`) so the candidate pool contains movies TMDB already knows are on the user's platforms. These fill the lookup budget first.
  - `buildMoreFeed` also fixed: all 4 pagination strategies now include `with_watch_providers` + `watch_region`, so every "load more" page is pre-filtered to the user's platforms.

### Next / open
- Carryover from session 2 still open (see below).

---

## 2026-06-14 (session 2)

### Done
- **Completed two stopped sessions' work** — all 6 commits on local `master`, all gates green (tsc 0 errors, lint 0 errors, 19 tests pass).
- **`watched` table wired end-to-end:**
  - `9449b12` feat(watched): schema + migration + `/api/watched` route
  - `2b7700f` fix(engine): `buildFeed` now queries the `watched` table and filters those IDs; removed the dead `watchlistRows` query (was computed, suppressed with `void`, never used); `buildMoreFeed` also fixed to filter both `ratings` and `watched` (was only filtering `seenSet` + `dismissedIds`)
  - `a8c2fc1` feat(feed): Eye icon button on card hover overlay; `useWatchedIds` hook loads seen IDs on mount; `handleWatched` removes card optimistically + POSTs + toasts
  - `66d9cb3` feat(watched-page): "Seen (N)" third tab in WatchedTabs backed by `watched` table; delete button (DELETE `/api/watched`) to undo
- **Quiz:**
  - `b13226f` feat(quiz): config + `/api/quiz` route (was already written, just committed)
  - `c0c5ae1` feat(quiz-ui): `/quiz` page (like/dislike list, submit disabled until ≥1 answer, redirects to feed), `loading.tsx`, "Take Quiz →" CTA on taste page in both the empty-state block and the profile header

### Decisions
- `watchlistIds` was removed from the engine entirely — it was a dead DB query with no downstream use.
- `RecommendationFeed.tsx` is 470 lines (under the hard 500 gate); `WatchedTabs.tsx` is 314 (advisory but under hard gate).
- Quiz API is movie-only (trending + discover) — TV shows deferred; see below.

### Next / open
- **Push to `origin/master`** — 8 commits ahead. Watch CI for migration-drift check (new `watched` migration must be recognized).
- **Run the DB migration** on the Neon instance (`npm run db:migrate` or Vercel env). The `watched` table only exists in code until migrated.
- **TV shows in quiz** — quiz API fetches movies only; a user who primarily watches TV gets incomplete taste data. Deferred design decision.
- Carryover: `enrich()` vs `enrichToFeedItems()` intentional divergence; `recommendation-engine.ts` at 327 lines (soft-300 advisory); behavioral spot-check of live app still not done.

---

## 2026-06-14

### Done
- **Pushed the backlog to `origin/master`** — the 06-12 cleanup (19 commits) plus
  the fixes below. CI green on every push; the first full-history gitleaks run
  passed clean (allowlist held).
- **Fixed the two CI non-blockers from the first green run:**
  - `b20f63a` ci: bumped actions off the deprecated Node 20 runtime →
    `actions/checkout@v6`, `actions/setup-node@v6`, `gitleaks/gitleaks-action@v3`
    (v3 is a pure runtime bump — no input/output/behavior changes).
  - `bbc2bec` refactor: cleared all 7 lint warnings *properly* (not suppressed):
    - Ad consent (`AdScripts`/`AdSlot`/`ConsentBanner`): replaced the mount-gated
      `useState`+`useEffect` with a shared `useSyncExternalStore` hook
      (`src/lib/ads/use-ads-consent.ts`) — SSR-safe, no setState-in-effect.
      `ConsentBanner` dropped its local `visible` state (consent event re-hides it).
    - `VibePicker`: moved the `window.__savePendingVibes` hand-off into a
      `useEffect` with cleanup (was a mutation during render).
    - `RecommendationFeed`: removed the unused `userId` prop (+ caller in
      `page.tsx`); ternary-statement → `if/else`; justify-disabled the one
      fetch-on-mount `setState` (`loading` already starts true → no-op re-set).
    - Removed the `react-hooks` warn-downgrade in `eslint.config.mjs`:
      `set-state-in-effect` and `immutability` are **errors** again now that every
      instance is fixed or documented.
- **CI confirmed clean:** both jobs green with **0 annotations** (was 4), running
  on the v6/v3 actions. `master` in sync with `origin`.

### Decisions
- The ad-consent mount-gate is now a `useSyncExternalStore` store, not an effect —
  this is the standing pattern for client-only state (cookie + `bb-consent-change`
  event). New ad/consent UI should use the `use-ads-consent` hooks.

### Next / open
- **gitleaks still not installed locally** — `winget install gitleaks` for the
  local pre-commit secret scan (CI covers it regardless).
- Carryover (unchanged): `enrich()` vs `enrichToFeedItems()` is an intentional
  divergence, not a safe merge; `recommendation-engine.ts` (318) over the soft-300
  advisory; behavioral spot-check of the feed against the running app still not done.

---

## 2026-06-12

### Done
- **Fixed nested `<button>` hydration error when rating.** `StarRating` rendered
  readOnly stars as disabled `<button>`s, which nested illegally inside the
  `TooltipTrigger` button in `ScoreDisplay`'s "Your rating" case. ReadOnly stars
  now render as plain `<span>`s. Committed as `08e5e9e`, merged to `master` via
  PR #1, branch deleted.
- **Committed the standing feed/tooling WIP** in five logical commits on local
  `master` (not yet pushed):
  - `055bdd1` docs(agents): file-length (300 soft / 500 hard) + no-hard-coded-values rules.
  - `e46df9e` chore: ESLint flat config (Next 16 dropped `next lint`), Vitest with
    `@/*` alias, unit tests for the platform registry + TMDB URL builders,
    lint/test/db npm scripts.
  - `a3c43ee` feat(feed): title/vibe search (`/api/recommendations/search`, results
    reuse card/modal via `toFeedItem()`), platform chips as toggle filters by TMDB
    provider id (engine now carries `platformIds`), ad bands render only when a
    provider owns the slot (`slotHasActiveProvider`), `<Fragment key>` fix,
    `suppressHydrationWarning` on `<html>`.
  - `07f915b` chore(db): initial Drizzle migration + snapshot (the history the CI
    drift check diffs against).
  - `0af8b56` ci: GitHub Actions (typecheck, lint, migration drift, test, build;
    build uses placeholder DATABASE_URL/AUTH_SECRET only — Vercel owns deploy).

### Done (later, ~20:20 — committed WIP, then a full lint-gate + cleanup pass)

First sorted the blended working tree into two clean commits, then did the
file-length / no-magic-values enforcement + cleanup. All on local `master`.

- **WIP committed as two features** (were uncommitted, blended from two sessions):
  - `4a4be9b` feat(browse): curated `/api/recommendations/browse` + `collections.ts`,
    plus shared `enrichToFeedItems()`/`DiscoverResult` on the engine. **Fixed a
    pre-existing type error** here: `DiscoverResult` was `(TmdbMovie|TmdbShow) &
    {media_type}`, which doesn't discriminate — made it a per-variant discriminated
    union so `media_type` narrows. (It did not typecheck before.)
  - `1a4d685` feat(search): "More like this" similar titles (`getSimilarTitles`,
    additive `similar[]`, feed grid).
- **Root hygiene** (`2b12afe`): `.env*` ignore was also swallowing `.env.example`
  — added `!.env.example` and tracked it (placeholders only). Removed stale
  pre-Neon `local.db*` from disk (still gitignored).
- **Magic numbers → `src/lib/config/`** (`f4aaf27`): extracted ~99 literals into
  dependency-free domain modules (`ads`, `durations`, `scoring`, `feed`,
  `ratings`). Added `scores.test.ts` characterization tests (cinema-score/ribbon
  math) and a placeholder `DATABASE_URL` in the vitest env (neon() is built at
  module load). Single-use presentational counts became local consts.
- **Split `RecommendationFeed.tsx`** (`6e79a27`): 507→450 lines; `FeedSkeleton` +
  `EmptyState` + `toFeedItem` moved to `FeedStates.tsx`.
- **ESLint gate ON** (`bb5f9d6`): `max-lines` error@500 (raw, project-wide) +
  `no-magic-numbers` error in `src` (config/ + tests exempt). `npm run lint` = 0
  errors. Smoke-tested that it blocks.
- **Pre-commit gate** (`7fb0de8`): husky + lint-staged (eslint on staged ts/tsx) +
  gitleaks (`.gitleaks.toml`, warns-if-absent locally), `.gitattributes` LF pin.
  Verified it blocks a magic-number violation.
- **CI** (`4c39592`): added a `secret-scan` gitleaks job (fetch-depth 0).

### Decisions
- Drizzle migrations and `.github/` are committed to git on purpose — CI's
  migration-drift step depends on the committed `drizzle/` snapshot.
- File-length **hard gate is 500** (mechanical); **300 is advisory** — one
  `max-lines` rule can't gate two thresholds.
- `no-magic-numbers` uses `detectObjects:false` + minimal ignore `[-1,0,1,2]`:
  object-property numbers and lone `const` initializers are allowed; expression/
  arg/array literals are not. Skeleton counts use `Array.from({length:N})` (the
  existing house idiom — object-property, so exempt).
- gitleaks is a binary, not an npm dep: local hook warns if absent, **CI enforces**.

### Next / open
- **Push the local `master` commits** — now **15 ahead of `origin/master`**
  (origin at `7dd53c4`). CI/secret-scan only run once pushed; **watch the first
  gitleaks run** in case history trips a rule not covered by `.gitleaks.toml`.
- **Local gitleaks not installed** — `winget install gitleaks` to get the local
  pre-commit secret scan (CI covers it regardless).
- **Behavioral verification pending:** the config extraction + feed split were
  verified by tsc/lint/tests (19 pass) but NOT by exercising the running app.
  Run it and confirm the feed, ad slot sizes, and score colors/ribbons are
  unchanged. (`npm run build` not yet run this session.)
### Done (later still, ~20:45 — safe tech-debt dedups)
- `0d1f91b` refactor(search): replaced the inline `genreMap` (byte-identical to
  `MOVIE_GENRE_IDS`) with the shared `genreNamesToIds()` helper.
- `b6814eb` refactor: centralized the four scattered `process.env.X` secret reads
  into a typed, server-only `src/lib/env.ts` (fulfills the AGENTS.md "secrets via
  a single typed config module" rule); also wired tmdb.ts to the previously-unused
  `TMDB_TIMEOUT_MS`. Build verified.

### Next / open (deliberately NOT done — need a call or change behavior)
- **`enrich()` (search route) vs `enrichToFeedItems()` (engine) are NOT a safe
  dedup.** They diverge on purpose: search keeps off-platform results (annotating
  availability) and returns a lean shape; the engine filters to on-platform and
  returns full `FeedItem`s. Unifying would change search behavior — needs a design
  decision, not a mechanical merge.
- `getCinemaScoreColor` is still duplicated (scores.ts vs ScoreDisplay) but both
  now use the shared threshold constants, so they can't drift on values — only on
  the presentational color strings. Left as-is (marginal).
- Soft-300: `recommendation-engine.ts` is 318. Per the split decision (hard-500
  only), left advisory.
