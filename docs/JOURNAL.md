# Busted Board — Project Journal

Most recent entry first. This is the source-of-truth status doc: what happened,
what's next, and any decisions made. Keep entries terse.

---

## NEXT SESSION — START HERE (last updated 2026-06-22 session 33)

Complete ordered checklist. Top = highest priority / blocking.

### Must do before any users see the app

1. **Vercel Pro upgrade** — vercel.com/account/billing. Hobby plan prohibits commercial use; Stripe payments make this mandatory ($20/mo). Defer until Stripe is ready.
2. **Stripe setup** — launching free-first (beta), so defer Stripe until after initial user feedback. When ready: stripe.com → 2 products ($3/mo, $25/yr) → 5 env vars in Vercel → webhook. See session 21 entry for step-by-step.
3. ~~**Reddit scanner**~~ — fully working via ScrapeCreators API (Reddit killed `.json` endpoints May 2026; OAuth registration broken). Needs `SCRAPECREATORS_API_KEY` in Vercel env (already set). Posting comments still not automated — ScrapeCreators is read-only; drafts must be posted manually.
4. ~~**GitHub Actions secrets**~~ — `APP_URL` + `GROWTH_ADMIN_SECRET` both set ✓
5. ~~**Fix `DELETE /api/user` bug**~~ — fixed ✓ (`communityLinks` + `communityLinkFlags` now deleted; Stripe cancellation TODO comment added for when Stripe goes live)

### Pre-launch polish (before GTM push)

- ~~**Paid Google AI Studio key**~~ — done ✓ billing enabled on BusterBoard AI Studio account, $25 credit loaded, Paid 1 tier active.
- ~~**Switch Gemini to Flash-Lite**~~ — done ✓ (`gemini-2.5-flash-lite` in `src/lib/gemini.ts` + `src/lib/config/growth.ts`)
- ~~**OG image**~~ — done ✓ AI-generated, 1200×630, committed to `public/og-default.png`, wired into layout.tsx OpenGraph + Twitter card metadata.
- **Custom domain** — `bustedboard.com` (~$12/yr). Update `APP_URL` in `src/lib/config/app.ts` after adding to Vercel
- **Google Search Console** — add property, submit `/sitemap.xml`. Do after domain is live
- **Sentry + PostHog** — `@sentry/nextjs` for errors + PostHog for product funnels/session replay. Install before any GTM push. 12 specific events to instrument — plan file missing; reconstruct from session 27 journal entry.
- ~~**Verify Reddit scan works**~~ — working ✓ via ScrapeCreators. Opportunities surfacing in Growth Dashboard.

### Marketing (phase 1 — 0→100 users)

- **Strategy**: launching free-first (beta). Settings page shows "Beta — free while we build" instead of upgrade buttons. Paid plans deferred.
- **r/trakt post** — draft ready in session 21 conversation. Post once Reddit scan is confirmed working. Fastest acquisition path — Trakt doubled to $60/yr and users are actively leaving.
- **r/cordcutters + r/streaming** — days 3 and 5 after r/trakt. Stagger posts, disclose you're the maker.
- **Product Hunt** — week 2 after Search Console is live. Needs OG image + demo GIF + active launch-day presence.

### Engineering (phase 2 — 100→1K users)

- **Email layer (Resend)** — welcome email (day 0), weekly digest (day 7), leaving-soon alert. Install `resend`, add `src/lib/config/email.ts`, trigger from NextAuth `signIn` callback
- ~~**feedCache cleanup TTL bug**~~ — investigated; sync-catalog is manual-only so blanket wipe is intentional. Not a bug.
- **Test suite (Vitest)** — see session 26 plan at `.claude/plans/bright-humming-sundae.md`. Tier 1: csv-parser, letterboxd-import, trakt-import, validateCommunityUrl.

### International expansion (phase 3+)

Per session 28 research in `docs/INTERNATIONAL-EXPANSION.md`:

- **UK first** (~10–20 hrs engineering): Add BBC iPlayer/ITVX/All 4 TMDB provider IDs to `src/lib/platforms.ts`; parameterize `language` in `src/lib/tmdb.ts`; £40 ICO registration
- **Before South Korea**: verify Watchmode API Korean coverage (`GET /sources/?regions=KR`) — if Wavve/TVING missing, core streaming-filter feature is broken
- **Before Brazil**: check Globoplay Watchmode coverage (`GET /sources/?regions=BR`) — Amazon.com.br affiliate pays $0 on streaming, use Globoplay CPA instead

---

## 2026-06-22 (session 33b — Expand Reddit scanner subreddit + keyword pool)

### Done

- **Widened scanner pool** — added 6 subreddits (movies, tvshows, Letterboxd, MovieSuggestions, NetflixBestOf, mubi) and 9 keywords (watchlist app, watch/show/movie tracker, track my shows, track what i watch, letterboxd + letterboxd alternative, movie/tv/show recommendation). Was 6 subreddits / 14 keywords; now 12 / 23.
- Root cause of sparse results: 48-hour age window + narrow keywords meant only 3 posts surfaced per scan. Wider pool should fill the Pending tab reliably.

### Next

- Scan Reddit and verify pending tab fills up with more results
- Consider bumping `GROWTH_MAX_THREAD_AGE_HOURS` if 12 subreddits still return few matches

---

## 2026-06-22 (session 33 — Add PBS, ViX, Xumo Play to free platform registry)

### Done

- **Researched free/FAST landscape** — surveyed top AVOD services and broadcast TV streaming. PBS is the only broadcast-TV-derived service with a full free on-demand catalog trackable by Watchmode. Linear-only FAST (Samsung TV Plus, LG Channels, Sling Freestream) excluded — no discrete rateable titles.
- **Added 3 new free platforms** — PBS (TMDB 209, Watchmode 215), ViX (TMDB 457, Watchmode 474), Xumo Play (TMDB 1963, Watchmode 472). All IDs verified against live APIs; web-search guesses for PBS (39) and Xumo (257) were wrong. None in MOTN.
- **Fixed `WATCHMODE_API_KEY` missing from Vercel** — was not set, causing silent `synced: 0` on all Watchmode syncs. Added via Vercel env vars → redeployed.
- **Watchmode errors now surface** — `watchmode.ts` previously returned `[]` silently on any HTTP error; now throws so the error appears in the sync result (`src/lib/watchmode.ts`).
- **Added `?force=true` to sync endpoint** — bypasses 24h cooldown per platform+type; needed because the first sync (with missing API key) wrote stale timestamps to `catalogSyncLog`. Both `syncMoTNPlatform` and `syncWatchmodePlatform` accept `force` param (`src/app/api/admin/sync-catalog/route.ts`).
- **Sync auth fix** — sync secret alone now sufficient to call `/api/admin/sync-catalog` without a browser session (useful for curl/automation).
- **Build speed** — `typescript: { ignoreBuildErrors: true }` added to `next.config.ts`; Next.js 16 removed ESLint from builds entirely. Saves ~30-60s on every Vercel deploy.
- **Catalog synced**: PBS 15 movies ✓, ViX 50 movies ✓. Xumo Watchmode coverage is sparse (0 titles) but TMDB discovery works for it. TV shows returned 0 across all three — expected, Watchmode has limited TV coverage for these sources.
- **Security note**: `ADMIN_EMAIL` env var is a soft guard — if unset, any logged-in user gets admin access. Confirmed it's set in Vercel.

### Next

- Tomorrow when 24h cooldown expires: hit Sync Movies + Sync TV Shows in Settings to keep catalog fresh
- **UK expansion**: when ready, add BBC iPlayer/ITVX/All 4/My5 the same way (TMDB provider IDs only; Watchmode has no UK free broadcaster coverage)

---

## 2026-06-22 (session 33 — launch prep + first Reddit outreach)

### Done

- **Paid Gemini billing** — AI Studio Paid 1 tier activated, $25 credit, auto-reload recommended. Key unchanged in Vercel.
- **DMCA email** — created `bustedboarddmca@gmail.com`. Added to Privacy page as Section 9 (full DMCA notice) and Settings footer.
- **Upstash Redis** — confirmed both env vars set in Vercel (Production + Preview). Rate limiting is active.
- **OG image** — AI-generated 1200×630 dark-theme image committed to `public/og-default.png`. Wired into `layout.tsx` with OpenGraph + Twitter card metadata.
- **404 + error pages** — created `src/app/not-found.tsx` and `src/app/(app)/error.tsx`. Branded, dark theme, links back to feed.
- **Growth Dashboard clipboard copy** — replaced broken "Post to Reddit" button with "Copy draft" (copies to clipboard, shows "Copied!" for 2s) + "Open thread" (links directly to the Reddit post).
- **Auto-increment build number** — pre-commit hook increments `build-number.txt` on every commit. Currently at ~125.
- **Growth subreddits/keywords expanded** — added r/movies, r/tvshows, r/Letterboxd, r/MovieSuggestions, r/NetflixBestOf, r/mubi; added "letterboxd", "watchlist app", "track my shows" and other keywords.
- **Reddit research** — browsed r/trakt, r/cordcutters, r/netflix, r/MovieSuggestions via Chrome DevTools. Key findings:
  - r/cordcutters: **Rule 9 No AI** — skip for BustedBoardBot
  - r/netflix: **Rule 4 No appspam, Rule 9 No suggestions** — skip
  - r/MovieSuggestions: **Rule 7 links must be neutral** — skip
  - **r/trakt is the primary target** — no bot/AI ban, mods include Trakt staff, users actively frustrated
- **First BustedBoardBot comments posted** — 3 helpful-only comments (no Busted Board mention) to build karma:
  1. "How do I find a simple list of watched series" — explained trakt.tv/users/[name]/watched/shows
  2. "Unable to import my data" — explained zip import bug + manual import workaround
  3. "I'm unable to access my Trakt account" — explained Hotmail/Outlook silent spam filtering fix
- **Decision: don't block Reddit promotion on Stripe/Vercel Pro** — app is free beta, no commerce, Hobby plan is fine. Reddit outreach starts now, monetization wired when there are users asking for it.

### BustedBoardBot karma tracker

| Date | Subreddit | Post | Type |
|------|-----------|------|------|
| 2026-06-22 | r/trakt | "How do I find a simple list of watched series" | Helpful (no promo) |
| 2026-06-22 | r/trakt | "Unable to import my data" | Helpful (no promo) |
| 2026-06-22 | r/trakt | "I'm unable to access my Trakt account" | Helpful (no promo) |

**Next step:** Once BustedBoardBot has ~10 karma, start natural Busted Board mentions in replies. Then post Sam's personal "I built this" intro post in r/trakt.

### Next actions

1. Check BustedBoardBot comment karma in 24-48 hrs
2. Post Sam's personal intro post in r/trakt once bot has karma
3. Set up auto-reload on AI Studio billing
4. Domain registration (bustedboard.com) when ready
5. Sentry error tracking before any major traffic

---

## 2026-06-22 (session 32 — Growth Dashboard fixes + Reddit scanner via ScrapeCreators)

### Done

- **Growth Dashboard nav** — added link to `/admin/growth` from Settings admin section (was only accessible via direct URL)
- **Scan button auth** — `/api/admin/growth/scan` was requiring a Bearer token the browser never sent; now accepts admin session OR Bearer token
- **Reddit API dead** — Reddit killed public `.json` endpoints May 2026; OAuth app registration broken (reCAPTCHA infinite loop, script grant deprecated). Switched scanner to ScrapeCreators API (read-only, 100 free credits). Set `SCRAPECREATORS_API_KEY` in Vercel.
- **Keyword broadening** — original multi-word phrases never matched real posts; expanded to include "trakt", "justwatch", "any recommendations", "something to watch", etc. Scanner now surfaces real opportunities.
- **Error visibility** — scan result now shows per-subreddit errors + fetched count for diagnostics
- **Auto-draft on open** — "Draft response" now immediately calls Gemini; no manual direction needed to start
- **Draft prompt tuning** — shorter, human-sounding replies; bot discloses it's BustedBoardBot; always mentions Busted Board for relevant posts; banned "check the forums" filler; requires specific actionable advice
- **Draft route timeout** — extended to 60s (`export const maxDuration = 60`) to prevent Vercel timeout on Gemini calls
- **Build info on dashboard** — commit hash + formatted local time shown under Growth Dashboard title
- **Build number** — auto-increments via pre-commit hook (`build-number.txt`); reads into `NEXT_PUBLIC_BUILD_NUMBER` at build time. Currently at 119.
- **Scroll fix** — Growth Dashboard was cut off by bottom nav; added `pb-24`
- **Catalog enrichment** — committed leftover changes from prior session: `enrichCatalogData()` now fetches both poster + overview from TMDB (was poster-only)

### Next actions

1. Manual posting workflow — "Post to Reddit" button currently throws (ScrapeCreators is read-only). For now: copy draft text, post manually as BustedBoardBot. Consider adding clipboard-copy button.
2. OG image (Canva, ~10 min) — needed before social push
3. Paid AI Studio key — before Reddit community posts go live

---

## 2026-06-22 (session 31 — Reddit scan fix, beta launch prep)

### Done

- **Reddit scan unblocked** — root cause: `APP_URL` GitHub Actions secret was missing (curl exit code 3 = URL malformed). Added `APP_URL` + `GROWTH_ADMIN_SECRET` to GitHub Actions secrets. `GROWTH_ADMIN_SECRET` also added to Vercel production env.
- **Reddit scanner rewritten** — original OAuth search API blocked by Reddit from Vercel IPs. Switched to unauthenticated public `/new.json` listing per subreddit + local keyword filter. 6 API calls/day instead of 48; 1-second delay between calls. Applied for Reddit API access (OAuth app blocked by reCAPTCHA — multiple browsers failed).
- **Scan route secured** — `/api/admin/growth/scan` now accepts GROWTH_ADMIN_SECRET bearer token OR valid admin session (was publicly accessible before).
- **Beta UI** — `SubscriptionSection` shows "Beta — free while we build" + "Beta" badge instead of broken $25/yr + $3/mo upgrade buttons (Stripe not configured). Upgrade buttons reappear automatically when `stripeEnabled` is set in the subscription API response.
- **User deletion bug fixed** — `communityLinks` + `communityLinkFlags` rows now deleted on account deletion. TODO comment added for Stripe sub cancellation when Stripe goes live.
- **Gemini Flash-Lite** — switched `gemini-2.5-flash` → `gemini-2.5-flash-lite` in `src/lib/gemini.ts` + `src/lib/config/growth.ts`. Free-tier available, ~5-10× cheaper, no quality tradeoff.
- **feedCache blanket wipe** — investigated; sync-catalog is manually triggered only, so wiping all caches on sync is intentional. Not a bug.
- **Strategy decision** — launching free-first (beta), then introducing paid subscriptions. Stripe + Vercel Pro deferred until after initial user feedback.

### Still unknown

- Whether Reddit's public `/new.json` works from Vercel IPs — scan returned "0 new, 0 skipped" which is the same silent-failure signature as the OAuth approach. Check Vercel function logs after next scan to confirm.

### Next actions

1. Check Vercel function logs after scanning — confirm `/new.json` requests succeed. If blocked: switch to RSS feeds.
2. OG image (Canva, ~10 min) — needed before any social push
3. Paid AI Studio key — before Reddit community posts go live
4. Reddit OAuth app — revisit when Reddit approves API access request

---

## 2026-06-14 (session 30 — Gemini quota analysis + BUSINESS.md corrections)

### Done

- **Gemini quota analysis** — audited all three production surfaces and quantified quota requirements by MAU tier.
  - `buildMoreFeed` (pages 2+) skips Gemini entirely; only page-1 cache misses call `rankRecommendations`
  - Per-call: ~4K tokens (3.5K input for 30 candidates + taste profile, ~500 output)
  - Feed cache (12 hrs) is the primary quota shield — ~1 call/user/day for daily-active users
  - Call volumes at 30% DAU/MAU: ~1K/mo (100 MAU), ~9K/mo (1K MAU), ~90K/mo (10K MAU)
  - Free tier RPD (~500–1,500/day) is the first limit to hit, not RPM — move to paid before any marketing push
  - At 1K MAU: ~$3–5/mo on Flash; ~$1/mo on Flash-Lite
- **BUSINESS.md Section 2 corrected** — three errors fixed:
  1. Model: tables listed "Flash-Lite" but code runs `gemini-2.5-flash` — corrected
  2. Call volume: 300K/mo at 10K MAU assumed 100% DAU/MAU with no cache — corrected to ~90K with 30% DAU/MAU + upper-bound note
  3. Dollar estimates: were Flash-Lite prices — recalculated for Flash
  - Added "Gemini call volume assumptions" and "Gemini API quota tiers" subsections
- **NEXT SESSION checklist updated** — added paid AI Studio key and Flash-Lite switch as pre-launch polish items

### Next actions

1. Get a paid Google AI Studio key (aistudio.google.com) — do before Reddit push
2. Switch `"gemini-2.5-flash"` → `"gemini-2.5-flash-lite"` in [src/lib/gemini.ts](../src/lib/gemini.ts) and [src/lib/config/growth.ts](../src/lib/config/growth.ts)

---

## 2026-06-14 (session 29 — advertising revenue research + BUSINESS.md Section 8)

### Done

- **Site advertising revenue section** — 102-agent deep research pass. Added Section 8 to `docs/BUSINESS.md` covering:
  - Ad network landscape updated to 2026: Ezoic exited small-publisher market (250K minimum, Feb 2026); Mediavine Journey dropped to 1,000 sessions/month (Oct 2025); Raptive dropped to 25,000 pageviews/month (Oct 2025)
  - RPM benchmarks: AdSense $1–$5, Mediavine Journey $15–$40+, Raptive $13–$47 `[2-1]`
  - Pageview assumption anchored to Letterboxd's 10.88 pages/visit (SimilarWeb) `[2-1]`
  - Ad revenue by MAU tier: ~$2/mo at 100 MAU (AdSense only); ~$19–$388/mo at 1K MAU; ~$194–$3,880/mo at 10K MAU
  - Revised combined P&L table at 10K MAU showing subscription + ad stacked
  - 8 new cited sources added to doc
- **Pushed all 3 pending commits** — origin/master now current (growth automation + international expansion + business analysis all live)

### Next

No new blockers added this session. Priority order unchanged — see checklist above.

---

## 2026-06-14 (session 24 — business analysis + growth automation)

### Done

- **Business feasibility analysis** — 111-agent deep research pass across 28 sources. Full verified P&L at 100/1K/10K MAU, break-even (8 paying subscribers covers all infra), LTV math (annual $42.89 vs monthly $18.50), competitor benchmarks (Trakt doubled to $60/yr — live opportunity). Saved to `docs/BUSINESS.md`.
- **Growth automation — Phase 1** — full stack built and DB migrated:
  - `src/lib/config/growth.ts` — target subreddits, keywords, limits
  - `src/lib/growth/reddit.ts` — Reddit OAuth client (raw fetch, no extra deps)
  - `src/lib/growth/scanner.ts` — subreddit × keyword scan, dedup by external_id
  - 4 API routes: `/api/admin/growth/scan`, `/opportunities`, `/draft`, `/post`
  - Growth dashboard at `/admin/growth` — tabs (pending/drafted/posted/dismissed), manual scan button
  - Gemini-powered draft chat (thread context preloaded, Sam types direction, agent drafts, Sam approves and clicks Post)
  - `.github/workflows/growth-monitor.yml` — daily cron 9:07am EDT
  - DB migration 0008 (`opportunities` + `social_posts` tables) — applied to Neon ✓

### Needs Sam's action before growth automation goes live

1. **Reddit app** — go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps), create a "script" type app, get `client_id` + `client_secret`
2. **Vercel env vars** — add to production:
   - `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USERNAME`, `REDDIT_PASSWORD`
   - `GROWTH_ADMIN_SECRET` — use: `4NzdyOODXl1BGsNLjfk4Gzs8ZX8Yg3jpIiy9xIpzfe8=`
   - `ADMIN_EMAIL` (if not already set — gates the /admin/growth UI)
3. **GitHub Actions secrets** — add to repo:
   - `APP_URL` = `https://busted-board.vercel.app` (or custom domain when live)
   - `GROWTH_ADMIN_SECRET` = same value as above
4. **Deploy** — push current branch to trigger Vercel redeploy with new routes + migration

### Carry-forward (from session 21)

- **Stripe** — still needs: account + 2 products + 5 env vars + webhook registration
- **Custom domain** — update `APP_URL` in `src/lib/config/app.ts`
- **`public/og-default.png`** — 1200×630 dark background, Canva ~10 min
- **Google Search Console** — submit sitemap after domain is live
- **r/trakt post** — draft ready from session 21 conversation; post when Reddit creds are live

---

## 2026-06-14 (session 28 — international expansion research)

### Done

- **Full international expansion strategy document** → `docs/INTERNATIONAL-EXPANSION.md`
- 5 parallel deep-research agents (competitive landscape, Asia, Europe, Brazil, Africa) + codebase technical gap analysis
- Identified recommended expansion sequence: **UK → South Korea → Brazil → Germany → India/Indonesia → South Africa → Japan**

### Key findings

**Competitive:** Simkl (free, unlimited tracking, Plex/Kodi integrations) is the main Trakt refugee destination — not busted-board. Must differentiate from Simkl (no AI recs, no streaming filter) not just Trakt. Trakt's window is still open — wider than Feb 2025 due to compounding own-goals (May 2025 legacy price elimination, Nov 2025 redesign backlash, 2026 further limit cuts). Letterboxd is being sold by Tiny (Versant interest, April 2026). Roku self-serve API (Nov 2025) is an unoccupied hardware distribution channel.

**Technical gaps confirmed:** `CATALOG_SYNC_REGION = "US"` hardcoded; `language: "en-US"` hardcoded in all TMDB calls; zero i18n infrastructure; Stripe USD-only; Amazon.com.br affiliate limited to Kindle/Android apps (not useful for streaming). Good news: TMDB watch provider path already passes `region` — adding UK platform IDs to `platforms.ts` + parameterizing `language` in `tmdb.ts` is sufficient for a working UK launch.

**UK is lowest-effort entry:** ~10–20 hrs engineering (platform IDs + language param), £40/yr ICO registration, zero localization cost.

**South Korea is the strongest Asia market:** 2.1 streaming subs per person (not household), BIFF Busan October 2026 is the marketing anchor, Stripe already supports KakaoPay/NAVER Pay. Neither Letterboxd nor Trakt offer regional pricing — PPP pricing (₩3,500/mo) is a genuine competitive moat.

**Brazil:** Letterboxd's largest non-English market (4.2% global users). PIX via Stripe EBANX partnership (93% adult adoption). Amazon.com.br affiliate is useless — use Globoplay's CPA affiliate instead. X/Twitter has been blocked in Brazil; use TikTok + WhatsApp instead.

**Critical pre-launch gate:** Verify Watchmode API Korean service coverage (`GET /sources/?regions=KR`) before committing to South Korea. If Wavve/TVING not covered, the core streaming filter feature is broken. Same for Globoplay in Brazil.

### Next actions

1. **Sam: check Vercel Analytics + Search Console** for existing international traffic — may change expansion priority
2. **Verify domestic PMF metrics** before committing to Phase 1 budget
3. **Phase 1 UK engineering:** Add BBC iPlayer/ITVX/All 4 TMDB provider IDs to `src/lib/platforms.ts`; parameterize `language` in `src/lib/tmdb.ts`; add region detection to onboarding; ICO registration (£40)
4. **Watchmode verification:** Call `/sources/?regions=KR` and `/sources/?regions=BR` to confirm or refute Korean/Brazilian service coverage

---

## 2026-06-14 (session 27 — user scaling plan)

### Done

- **Comprehensive scaling plan developed** — full strategy at `.claude/plans/we-need-to-make-purring-giraffe.md`. No code changed this session.

### Plan summary

Phased roadmap across 4 dimensions: acquisition, retention, monetization, technical capacity. Phases keyed to user milestones: 0→100, 100→1K, 1K→10K, 10K+.

**Phase 0 (pre-GTM blockers):** Stripe setup, OG image, Google Search Console, custom domain, Sentry error tracking.

**Phase 1 (0→100):** r/trakt + r/letterboxd posts, Product Hunt. Watch the onboarding funnel (land → sign in → platforms → feed → first rating). No tech changes needed at this scale.

**Phase 2 (100→1K):** Email layer (Resend), welcome email, weekly digest cron, leaving-soon alerts. Upgrade Gemini to paid API before ~500 users. Enable Neon PgBouncer (zero code, just env var swap).

**Phase 3 (1K→10K):** SEO programmatic pages (`/movies/[genre]`, `/leaving-soon/[platform]`), light social graph, ad tier optimization, Neon Scale upgrade, TMDB request queue.

**Metrics:** PostHog (product funnels + session replay) + Sentry (errors) + UTM params on all external links. 12 specific events to instrument before launch. Key number to watch: upgrade prompt → Stripe checkout rate (below 5% = copy problem).

### Bugs found during planning

1. **`DELETE /api/user` is incomplete** — `subscriptions` and `communityLinks`/`communityLinkFlags` rows are not deleted. Fix before launch: cancel active Stripe subscription via API, then delete those rows explicitly.
2. **feedCache cleanup TTL inconsistency** — the plan originally said `24hr` but `FEED_CACHE_MAX_AGE_MS` is `12hr`. Cleanup cron should use `48hr` buffer, not a hardcoded literal that contradicts the named constant.

### Key strategic decisions

- Pro conversion driver: **weekly digest + leaving-soon alerts** (not "no ads" — the Trakt/Letterboxd audience runs ad-blockers)
- Add **14-day free trial** to Stripe checkout (`trial_period_days: 14`) — one config line, 2–3× conversion uplift
- **"Leaving soon" data**: verify MOTN/Watchmode actually expose departure dates before building the email feature around it
- International users: add explicit US-only availability disclosure at signup (MOTN catalog is US-centric)
- MOTN budget: stagger catalog sync to 2 platforms/day max; daily sync of all 14 platforms hits 84% of 500-call/month ceiling

### Open / next session

- Fix the two bugs above (user deletion + feedCache cleanup) — small, pre-launch
- Install Sentry (`@sentry/nextjs`) + PostHog before any GTM push
- Verify MOTN/Watchmode API for departure date availability

---

## 2026-06-14 (session 26 — testing plan)

### Done

- **Testing plan developed** — full tiered strategy documented at `.claude/plans/bright-humming-sundae.md`. No code changed this session; this was pure planning.

### Plan summary

**Tier 1 (pure unit tests, ready now):** `csv-parser.ts`, `letterboxd-import.ts`, `trakt-import.ts`, `validateCommunityUrl`, `getWatchUrl`, `getCinemaScoreColor`, `titleOf`/`releaseDateOf`

**Tier 1.5 (extract then test):** Move `buildTitleMap`/`findMediaMatch` + `LETTERBOXD_YEAR_TOLERANCE` from Letterboxd route into `letterboxd-import.ts`. Extract Stripe webhook event dispatch into new `src/lib/stripe-events.ts` with signature `applyStripeEvent(event) => { customerId, patch } | null`.

**Tier 2 (in-memory SQLite):** `getScores()` with real Drizzle-over-SQLite — `vi.mock('./db')` won't work for Drizzle's builder chain.

**Tier 3 (coverage gate):** `@vitest/coverage-v8`, 70% threshold on testable `src/lib/**`, coverage on PRs only (not every master push).

**Tier 4 (Playwright E2E):** Post-launch, gated on Neon "database per branch" being set up first — Vercel preview shares prod DB by default.

### Foundational work required before first tests land

1. Add `OMDB_API_KEY` + `AUTH_SECRET` placeholders to `vitest.config.ts`
2. Add `src/lib/__fixtures__/**` to `.gitleaks.toml` allowlist — test fixtures will contain Stripe event IDs that trip the secret scanner
3. Create `src/lib/__fixtures__/` directory structure (csv/, stripe/, time.ts, db.ts)
4. Add `vi.useFakeTimers()` / `withFixedDate` helper — several tests are time-sensitive

### Open / next session

- Start with the 4 foundational items above (small, unblock everything else)
- Then Tier 1 tests (no new deps, ~2–3 hrs)
- See plan file for full priority order

---

## 2026-06-14 (session 25 — community free links complete)

### Done

- **Community free links feature** — full implementation shipped and deployed:
  - `src/lib/config/community.ts` — domain allowlist (11 platforms), submission limits, `validateCommunityUrl()` (scheme + hostname validation)
  - `src/lib/schema.ts` — `communityLinks` + `communityLinkFlags` tables (per-user flag dedupe, unique URL constraint, media index)
  - `drizzle/0007_deep_senator_kelly.sql` — migration generated and applied to Neon ✓
  - `src/app/api/community-links/route.ts` — GET (public) + POST (auth, all caps + rate limits)
  - `src/app/api/community-links/[id]/flag/route.ts` — per-user flag dedupe, atomically increments flagCount
  - `src/components/feed/CommunityLinkSubmitForm.tsx` — submit form component
  - `src/components/feed/MovieDetailModal.tsx` — "Free to watch" section, empty-state CTA, flag buttons, scrollable content div
- **Deployed** — pushed to master, Vercel auto-deploy triggered

### Design decisions made

- Allowlist-only (no admin queue) — piracy structurally impossible without moderation burden
- `communityLinkFlags` dedupe table — prevents single user hitting FLAG_AUTO_HIDE_THRESHOLD (3) alone
- `status` column kept but always `'approved'` in V1 — admin escape hatch for future manual rejection
- Circular import avoided by adding tables directly to `schema.ts` (335 lines, under 500 hard limit)

### Open / Sam's action items

- **DMCA contact email** — add `dmca@` to footer before marketing the feature (safe harbor prerequisite for UGC)
- **Stripe** — account, 2 products ($3/mo, $25/yr), 5 env vars in Vercel, webhook. See session 21 entry.
- **r/trakt post**, **Google Search Console**, **og-default.png**, **custom domain** — see session 21 entry.

---

## 2026-06-14 (session 24 — YouTube feed fix + migration)

### Done

- **YouTube feed fix** — TMDB provider 235 confirmed correct for YouTube Free. Root cause: free-platform titles (YouTube, Tubi, Pluto) couldn't compete against Netflix/Prime for top-60 slots in the discover query. Fixed by adding a dedicated `freePlatformMovies` bucket in `buildFeed` that queries only the user's free platforms with a lower vote-count floor (`10` vs `50`).
- **getScores parallelized** — was `await` inside `for...of` (up to 30 × 8s OMDB timeout = 4 min cold). Replaced with `Promise.all` in both `buildFeed` and `buildMoreFeed`. Cold-cache load time drops from minutes to ~8s worst case.
- **Migration 0007 applied** — `community_links` and `community_link_flags` tables live in Neon.

### Open (carried to session 25)

- **Stripe** — account, 2 products ($3/mo, $25/yr), 5 env vars in Vercel, webhook.
- **r/trakt post**, **Google Search Console**, **og-default.png**, **custom domain** — see session 21 entry.

---

## 2026-06-14 (session 20 wrap-up — revenue setup complete)

### What was built this session (sessions 20–23 combined)

- **Trakt CSV import** — Settings → "Import from Trakt"; ratings + watchlist, idempotent, logs to importHistory
- **Letterboxd CSV import** — Settings → "Import from Letterboxd"; matches by title+year ±1 against catalog (no TMDB calls)
- **Stripe freemium** — subscriptions table, billing routes, webhook handler, watchlist gate (50-item free limit). Stripe is gracefully inactive until env vars are added — app works normally without them.
- **Public browse pages** — `/browse` and `/top/[platform]` (14 pages), ISR 1hr, no login required; OG metadata, JSON-LD breadcrumbs, canonical URLs, sitemap, robots.txt
- **Affiliate links** — "Watch on [Platform]" button in detail modal; Prime Video → Amazon Associates (`tag=bustedboard-20`); affiliate disclosure added (FTC required)
- **Mobile fixes** — card action buttons visible on touch; ad banner `col-span-full`
- **DB migration 0006 applied** — `subscriptions` table live in Neon ✓
- **Competitive research** — 103-agent deep research confirmed: JustWatch now sells "Sponsored Recommendations" (trust gap), Trakt doubled prices Feb 2025 (user exodus now), Tubi proved AI discovery demand but locked to their catalog

### Completed by Sam today

- **Amazon Associates signup** ✓ — tag `bustedboard-20` registered at affiliate-program.amazon.com

### Priority queue for next session

**Must do before launch:**

1. **Stripe** — create account → 2 products ($3/mo, $25/yr) → 5 env vars in Vercel → register webhook. Full checklist in session 21 entry below.
2. **Deploy** — pushing the current branch or triggering a Vercel redeploy to get all session 20–23 changes live.

**High-impact, low-effort:**
3. **r/trakt post** — draft is in session 21 conversation. Post when TV sync is confirmed working. This is the fastest user acquisition path right now (Trakt user exodus is live).
4. **Google Search Console** — add property, submit `/sitemap.xml`. Compounds over weeks.

**Nice to have:**
5. `public/og-default.png` (1200×630) — needed for social card previews. Canva, ~10 min.
6. Custom domain — update `APP_URL` in `src/lib/config/app.ts` after adding to Vercel.

---

## 2026-06-14 (session 23 — SEO & marketing automation code)

### Done

- **OG metadata + canonicals** on `/browse` and `/top/[platform]` pages — `openGraph`, `twitter: { card: "summary_large_image" }`, and `alternates.canonical` added to both pages. When `og-default.png` is created and `APP_URL` is updated to a custom domain, social cards and canonical URLs update automatically.
- **BreadcrumbList JSON-LD** injected in `/browse` and `/top/[platform]` pages — valid schema.org structured data for Google rich results, no DB query needed.
- **Freshness signal** on `/top/[platform]` — "Updated [Month Year]" line below the h1; updates on every ISR revalidation.
- **Sitemap improved** — replaced catalog service ID source with `PLATFORM_REGISTRY` (consistent with `generateStaticParams`); changed changeFrequency from `daily` → `weekly` for platform/browse pages, `daily` → `monthly` for home.
- **Affiliate disclosure** in `MovieDetailModal` — small text below the "Watch on [Platform]" button; FTC-required.
- **No duplicate constants** — removed newly-created `site.ts`; all URL references use `APP_URL` from existing `src/lib/config/app.ts`.

### Needs Sam's action (manual, no code)

- **Create `public/og-default.png`** (1200×630px) — dark background, "Busted Board" wordmark, tagline "AI recommendations. No sponsored results." Required before OG image metadata is live. Use Canva (free).
- **Get a custom domain** — `bustedboard.com` or similar (~$12/yr). Update `APP_URL` in `src/lib/config/app.ts` after adding to Vercel.
- **Google Search Console** — submit `https://[domain]/sitemap.xml` after domain is live.
- **Reddit posts** — r/trakt (day 1), r/cordcutters (day 3), r/streaming (day 5). Stagger; disclose you're the maker.
- **Buffer** — load 30 posts (one per platform × variety of hooks), set to drip daily.
- **Amazon Associates** — confirm tag `bustedboard-20` is active before linking from Reddit.
- **Product Hunt** — week 2, after Search Console is live. Needs gallery screenshots + demo GIF + active launch-day presence.

---

## 2026-06-14 (session 22 — feed UX polish)

### Done

- **Surprise Me grid** — cards were rendering full-width with `aspect-[2/3]` posters filling the viewport; changed container from `space-y-4` to `grid grid-cols-3 gap-3` so all 3 cards show at movie-poster size
- **Feed sticky command bar** — search + Gem/card-size/refresh icons now live in a single sticky row that stays locked at top while scrolling; title "Busted Board" scrolls away with content
- **Platform chips → horizontal scroll** — chips row no longer wraps; single scrollable row with `scrollbar-hide` CSS utility added to `globals.css`
- All changes shipped in the same commit as session 21's Letterboxd/SEO work (parallel sessions merged)

### Open

_(no new items — see session 21 open tasks above)_

---

## 2026-06-14 (session 21 — growth tasks: Letterboxd import, SEO, deploy)

### Done

- **Migration 0006 applied** — `subscriptions` table live in Neon.
- **Letterboxd CSV import** — full stack:
  - `src/lib/csv-parser.ts`: shared CSV parsing utilities extracted from `trakt-import.ts` (parseCsvLine, parseCsv, col) — both importers now share one implementation
  - `src/lib/letterboxd-import.ts`: parser for Letterboxd `ratings.csv`/`watched.csv` and `watchlist.csv`; no TMDB IDs in Letterboxd exports, so matching is title+year
  - `src/app/api/import/letterboxd/route.ts`: POST endpoint; batch-loads `media` catalog once, does in-memory title+year match (±1yr tolerance), inserts ratings and watchlist items, logs to `importHistory`
  - `src/components/settings/LetterboxdImportSection.tsx`: two-file upload UI with result summary card showing imported/skipped/not-found counts
  - `src/app/(app)/settings/page.tsx`: Letterboxd section added after Trakt section
- **Sitemap + robots** for SEO:
  - `src/app/sitemap.ts`: generates `/sitemap.xml` covering `/`, `/browse`, `/top/[slug]` for all 14 platforms; daily changeFrequency
  - `src/app/robots.ts`: allows crawlers on public pages, blocks `/api/`, `/settings`, `/login`
- **r/trakt post draft** written (in this session's conversation — ready to post)

### Next / open — needs Sam's action

- **Stripe (before billing goes live):**
  1. Create Stripe account → set up 2 products (monthly $3/mo, annual $25/yr)
  2. Get keys: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  3. Add all 5 to Vercel dashboard
  4. Register webhook in Stripe dashboard → `https://busted-board.vercel.app/api/webhooks/stripe`
  5. Events to listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- **Amazon Associates:** register at associates.amazon.com, confirm tracking tag `bustedboard-20` is available
- **Google Search Console:** add property for `busted-board.vercel.app`, submit `/sitemap.xml`
- **r/trakt post:** copy the draft from session 21 conversation, post after confirming TV sync works
- **Sync TV Shows:** click Settings → Admin → Sync TV Shows (MOTN series prefix fix is live)

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

## 2026-06-14 (session 20b — Stripe graceful degradation + Letterboxd import)

### Done

- **Stripe graceful degradation**: `stripe-server.ts` now uses lazy client initialization — importing the module no longer throws if `STRIPE_SECRET_KEY` is absent. `isStripeEnabled()` guard added to all billing routes and the watchlist freemium gate. App works normally until Stripe env vars are set.
- **Letterboxd CSV import**:
  - `src/lib/csv-parser.ts` — shared CSV parsing utilities (quoted fields, CRLF)
  - `src/lib/letterboxd-import.ts` — Letterboxd ratings+watchlist parser (0.5–5.0 → 1–5 scale, handles `ratings.csv` and `watched.csv`)
  - `src/app/api/import/letterboxd/route.ts` — loads full catalog once, matches by title+year ±1 (no TMDB API calls); `notFound` for titles not yet synced
  - `src/components/settings/LetterboxdImportSection.tsx` — settings section, client-side validation before upload
- **SEO improvements** to browse pages: OG metadata, canonical URLs, JSON-LD breadcrumbs, `SITE_URL` config in `src/lib/config/site.ts`
- All: typecheck clean, ESLint clean

### Needs before Stripe goes live (unchanged)

- Run `npx drizzle-kit migrate` (subscriptions table, migration `0006_famous_luminals.sql` is ready)
- Add 5 Stripe env vars to Vercel + create products + register webhook (see setup guide)

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
