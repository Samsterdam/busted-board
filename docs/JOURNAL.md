# Busted Board — Project Journal

Most recent entry first. This is the source-of-truth status doc: what happened,
what's next, and any decisions made. Keep entries terse.

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
