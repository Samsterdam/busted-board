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

### Decisions
- Drizzle migrations and `.github/` are committed to git on purpose — CI's
  migration-drift step depends on the committed `drizzle/` snapshot.

### Next / open
- **Decide how to land the 5 local `master` commits**: push straight to
  `origin/master`, or move to a branch + PR so the new CI gates them first.
  (Leaning branch + PR — CI only runs on PRs, so a direct push wouldn't exercise
  its own pipeline.)
- The rating fix was verified by inspection, not by exercising the running app.
  Optional: run the app and rate something to confirm the hydration error is gone.
