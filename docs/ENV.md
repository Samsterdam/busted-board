# Busted Board — Environment Variables

All secrets are managed as environment variables. Never commit them to source.
Local development uses `.env.local` (git-ignored). Production values are set
in the Vercel project dashboard.

---

## Required — Core App

| Variable | Where to get it | Notes |
|---|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` | HMAC key for NextAuth JWT signing. Required in all envs. |
| `AUTH_URL` | — | Full base URL of the deployment (e.g. `https://busted-board.vercel.app`). Required in production. |
| `AUTH_GOOGLE_ID` | [Google Cloud Console → OAuth 2.0 Clients](https://console.cloud.google.com/apis/credentials) | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Same as above | Google OAuth client secret |
| `DATABASE_URL` | [Neon Console](https://console.neon.tech/) → Connection string (pooled) | Pooled Neon connection used by the app at runtime via `@neondatabase/serverless` |
| `DATABASE_URL_UNPOOLED` | Neon Console → Connection string (direct) | Direct (non-pooled) connection used only by `drizzle-kit` for schema migrations |
| `TMDB_API_KEY` | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) | Movie/TV metadata, images, streaming providers |
| `GEMINI_API_KEY` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | Taste profile generation and feed ranking |

---

## Optional — Enhanced Features

| Variable | Where to get it | Effect when absent |
|---|---|---|
| `OMDB_API_KEY` | [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx) (free tier) | Critics score (Rotten Tomatoes-style) unavailable; audience score still shown |
| `UPSTASH_REDIS_REST_URL` | [Upstash Console](https://console.upstash.com/) → Database → REST API | Rate limiting skipped entirely (local dev works without it) |
| `UPSTASH_REDIS_REST_TOKEN` | Same as above | Rate limiting skipped entirely |

Both Upstash vars must be set together — the Redis client is only initialized
when **both** are present. If either is missing, the rate limiter is
disabled gracefully (requests pass through uncounted).

---

## Optional — Ads

| Variable | Default | Notes |
|---|---|---|
| `NEXT_PUBLIC_AD_PRIMARY` | `"off"` | Ad provider slug. `"off"` disables ads entirely. Set to provider name (e.g. `"adsense"`) and add that provider's vars when ready to monetize. |

This is a `NEXT_PUBLIC_` variable — it is included in the browser bundle.
Do not store secrets here.

---

## Optional — Catalog Sync

Powers the pre-populated streaming catalog used by the recommendation engine.
When the catalog is populated, the engine can serve platform-filtered results
without making per-request TMDB watch-provider calls. Without these vars the
sync endpoint still exists but the engine falls back to live TMDB lookups only.

| Variable | Where to get it | Effect when absent |
|---|---|---|
| `STREAMING_AVAILABILITY_API_KEY` | [movieofthenight.com](https://movieofthenight.com) → Dashboard → API Key | Catalog sync skips all MOTN platforms (Netflix, Prime, Disney, Max, Hulu, Apple TV+, Roku, Peacock, Paramount+, Tubi, Pluto TV) |
| `WATCHMODE_API_KEY` | [api.watchmode.com](https://api.watchmode.com/) | Catalog sync skips Watchmode platforms (YouTube Free, Hoopla, Plex) |
| `CATALOG_SYNC_SECRET` | Any random string (`openssl rand -base64 32`) | Sync endpoint accepts requests without the secret header |
| `ADMIN_EMAIL` | Your Google account email | Any authenticated user can trigger a sync |
| `NEXT_PUBLIC_SHOW_ADMIN` | Set to `"true"` | Admin "Sync Catalog" button hidden in Settings UI |
| `NEXT_PUBLIC_CATALOG_SYNC_SECRET` | Same value as `CATALOG_SYNC_SECRET` | Client-side sync button can't send the auth header |

---

## Optional — Growth Automation

Powers the `/admin/growth` dashboard: daily Reddit opportunity scanning, Gemini-assisted reply drafting, and one-click Reddit posting. The app works normally without these — the growth dashboard just shows "Reddit credentials not configured."

| Variable | Where to get it | Effect when absent |
|---|---|---|
| `REDDIT_CLIENT_ID` | [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) → Create app → type: **script** | Scanning and posting disabled |
| `REDDIT_CLIENT_SECRET` | Same Reddit app page | Scanning and posting disabled |
| `REDDIT_USERNAME` | Your Reddit account username | Scanning and posting disabled |
| `REDDIT_PASSWORD` | Your Reddit account password | Scanning and posting disabled |
| `GROWTH_ADMIN_SECRET` | Any random string (`openssl rand -base64 32`) | Cron scan endpoint accepts requests without auth header |

All four Reddit vars must be set together. Create a "script" type app at reddit.com/prefs/apps — this gives you OAuth credentials for a single-account bot (your account). The User-Agent sent is `BustedBoard/1.0`.

**GitHub Actions secrets** (for the daily cron in `.github/workflows/growth-monitor.yml`):

- `APP_URL` — your production URL (e.g. `https://busted-board.vercel.app`)
- `GROWTH_ADMIN_SECRET` — same value as the env var above

---

## Vercel Setup Checklist

When provisioning a new deployment:

1. **Neon:** create a project in `us-east-1`. Copy both the pooled and
   direct connection strings.
2. **Google OAuth:** add the production domain to the authorized redirect
   URIs: `https://<domain>/api/auth/callback/google`.
3. **Upstash Redis:** create a database in `us-east-1`. Copy the REST URL
   and token.
4. **`AUTH_SECRET`:** generate a fresh secret: `openssl rand -base64 32`.
   Do not reuse the local dev value.
5. **`AUTH_URL`:** set to `https://<your-vercel-domain>`.
6. **Run migrations** after first deploy: `npm run db:migrate` (uses
   `DATABASE_URL_UNPOOLED`).
7. **Catalog sync (optional but recommended):** set `STREAMING_AVAILABILITY_API_KEY`,
   `WATCHMODE_API_KEY`, `CATALOG_SYNC_SECRET`, `ADMIN_EMAIL`, `NEXT_PUBLIC_SHOW_ADMIN=true`,
   and `NEXT_PUBLIC_CATALOG_SYNC_SECRET`. Then trigger an initial sync via
   Settings → Admin → Sync Catalog. Without a sync the recommendation engine
   falls back to TMDB discover buckets only (still functional, just slower to
   resolve platform availability per-request).

---

## Local `.env.local` Template

```env
# TMDB
TMDB_API_KEY=your_tmdb_key

# Gemini
GEMINI_API_KEY=your_gemini_key

# OMDB (optional)
OMDB_API_KEY=your_omdb_key

# NextAuth
AUTH_SECRET=your_32_byte_base64_secret
AUTH_URL=http://localhost:3000
AUTH_GOOGLE_ID=your_google_client_id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your_google_client_secret

# Neon (Postgres)
DATABASE_URL=postgresql://user:pass@host-pooler.region.aws.neon.tech/db?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://user:pass@host.region.aws.neon.tech/db?sslmode=require

# Upstash Redis (optional — rate limiting disabled when absent)
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# Ads
NEXT_PUBLIC_AD_PRIMARY=off

# Catalog sync (optional — see docs/ENV.md for details)
STREAMING_AVAILABILITY_API_KEY=your_motn_key
WATCHMODE_API_KEY=your_watchmode_key
CATALOG_SYNC_SECRET=your_random_secret
ADMIN_EMAIL=your_google_email@gmail.com
NEXT_PUBLIC_SHOW_ADMIN=true
NEXT_PUBLIC_CATALOG_SYNC_SECRET=your_random_secret

# Growth automation (optional — see docs/ENV.md for details)
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USERNAME=your_reddit_username
REDDIT_PASSWORD=your_reddit_password
GROWTH_ADMIN_SECRET=your_random_secret
```
