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
```
