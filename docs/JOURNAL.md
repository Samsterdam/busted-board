# Busted Board — Project Journal

Most recent entry first. This is the source-of-truth status doc: what happened,
what's next, and any decisions made. Keep entries terse.

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
