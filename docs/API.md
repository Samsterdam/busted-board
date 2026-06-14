# Busted Board — API Reference

All routes are prefixed `/api/`. Authentication is enforced at the Edge by
`proxy.ts` before requests reach handlers; see [SECURITY.md](SECURITY.md) for
the full auth and rate-limit model.

**Auth legend**

| Symbol | Meaning |
|---|---|
| ✓ | 401 if no valid session |
| ◑ | Returns empty result (not 401) if unauthenticated |

---

## Ratings

### `GET /api/ratings`
Auth: ✓ · Rate limit: general (300/hr)

Returns the current user's ratings, filtered to `source = "user"` only
(excludes quiz and quick-tap signals). Paginated.

**Query params**
- `page` — page number (default 1, 20 items per page)

**Response**
```json
{ "ratings": [ { "id": 1, "tmdbId": 12345, "tmdbType": "movie", "title": "...", "rating": 4, "source": "user", ... } ] }
```

---

### `POST /api/ratings`
Auth: ✓ · Rate limit: general (300/hr)

Create or update a rating. Upserts on `(userId, tmdbId)`; merges notes and
watchStatus with any existing record on update.

**Request body**
```json
{
  "tmdbId": 12345,
  "tmdbType": "movie",
  "title": "Inception",
  "posterPath": "/path.jpg",
  "rating": 4,
  "notes": "optional, max 500 chars",
  "watchStatus": "watched",
  "source": "user"
}
```

**Response** `{ "id": 1, "created": true }` or `{ "id": 1, "updated": true }`

---

### `DELETE /api/ratings/[id]`
Auth: ✓ · Rate limit: general (300/hr)

Delete a single rating by its row ID.

**Response** `{ "ok": true }`

---

### `GET /api/ratings/stats`
Auth: ✓ · Rate limit: general (300/hr)

Rating distribution for the current user (`source = "user"` only).

**Response**
```json
{ "distribution": { "1": 2, "2": 5, "3": 10, "4": 8, "5": 3 }, "total": 28 }
```
Missing buckets are filled with `0`.

---

## Watchlist

### `GET /api/watchlist`
Auth: ◑ · Rate limit: general (300/hr)

Returns the current user's watchlist ordered newest-first. Returns
`{ "watchlist": [] }` (not 401) when unauthenticated.

---

### `POST /api/watchlist`
Auth: ✓ · Rate limit: general (300/hr)

Add a title. Idempotent — silently skips if already bookmarked.

**Request body** `{ "tmdbId": 12345, "tmdbType": "movie", "title": "...", "posterPath": "/..." }`

**Response** `{ "ok": true }`

---

### `DELETE /api/watchlist`
Auth: ✓ · Rate limit: general (300/hr)

**Request body** `{ "tmdbId": 12345 }`

**Response** `{ "ok": true }`

---

## Watched

### `GET /api/watched`
Auth: ✓ · Rate limit: general (300/hr)

Watched items ordered by `seenAt` descending.

---

### `POST /api/watched`
Auth: ✓ · Rate limit: general (300/hr)

Mark as seen. Idempotent. Side effects:
- Removes the title from `watchlist` (seen ⇒ no longer "want to watch").
- Invalidates the user's feed cache.

**Request body** `{ "tmdbId": 12345, "tmdbType": "movie", "title": "...", "posterPath": "/..." }`

**Response** `{ "ok": true }`

---

### `DELETE /api/watched`
Auth: ✓ · Rate limit: general (300/hr)

**Request body** `{ "tmdbId": 12345, "tmdbType": "movie" }`

**Response** `{ "ok": true }`

---

## Recommendations

### `GET /api/recommendations/feed`
Auth: ✓ · **Rate limit: 30/hr**

Personalized feed. On page 1, checks the feed cache first; on cache miss or
`refresh=1`, calls the recommendation engine (which may call Gemini).

**Query params**
- `refresh=1` — bypass cache, force rebuild
- `page` — page number; page ≥ 2 calls `buildMoreFeed()` (bypasses cache)
- `seenIds` — comma-separated tmdbIds to exclude from page 2+ results

**Response**
```json
{
  "feed": [ /* FeedItem[] */ ],
  "cached": true,
  "page": 1,
  "stale": false,
  "needsRatings": false
}
```

**Notable behavior**
- Returns `{ "feed": [], "needsRatings": true }` if the user has < 1 rating.
- On Gemini failure: returns stale cache with `"stale": true` if available;
  otherwise `503`.

---

### `GET /api/recommendations/surprise`
Auth: ✓ · Rate limit: general (300/hr)

Random high-rated titles from the user's streaming platforms. Re-fetches a
random TMDB page on each call (not cached).

**Query params**
- `genre` — optional genre name; converted to TMDB genre ID server-side

**Response** `{ "feed": [ /* FeedItem[] */ ], "empty": false }`

Returns `400` if the user has no platforms configured.

---

### `GET /api/recommendations/browse`
Auth: ✓ · Rate limit: general (300/hr)

Browse curated or filtered content.

**Query params**
- `collectionId` — collection slug (e.g., `"bingeable"`)
- `mediaType` — `"movie"` | `"tv"` | `"all"` (default `"all"`); overridden by collection's locked type

**Response** `{ "feed": [ /* FeedItem[] */ ] }`

---

### `POST /api/recommendations/search`
Auth: ✓ · Rate limit: general (300/hr)

TMDB multi-search with no AI ranking. Returns up to 8 movie/TV results.

**Request body**
```json
{ "query": "Inception" }
```

**Response**
```json
{
  "results": [
    { "tmdbId": 27205, "tmdbType": "movie", "title": "Inception", "year": "2010",
      "posterUrl": "https://...", "overview": "...", "originalLanguage": "en", "voteCount": 35000 }
  ],
  "similar": [],
  "explanation": "Results for \"Inception\""
}
```

Returns `{ "results": [], "similar": [], "explanation": null }` on empty query or error.

---

### `GET /api/recommendations/discovery`
Auth: ✓ · Rate limit: general (300/hr)

Curated discovery items scoped to the user's streaming platforms. Returns
`{ "discovery": [] }` if the user has no platforms configured.

**Response** `{ "discovery": [ /* FeedItem[] */ ] }`

---

## Taste Profile

### `GET /api/taste-profile/analyze`
Auth: ✓ · Rate limit: general (300/hr)

Fetch the current user's stored taste profile.

**Response**
```json
{
  "profile": {
    "top_themes": ["..."],
    "avoid_themes": ["..."],
    "fav_directors": ["..."],
    "fav_actors": ["..."],
    "tone_description": "...",
    "recommendation_strategy": "..."
  },
  "lastGeneratedAt": "2026-06-14T00:00:00.000Z"
}
```
Returns `{ "profile": null }` if never generated.

---

### `POST /api/taste-profile/analyze`
Auth: ✓ · **Rate limit: 10/hr** (Upstash, per-IP)

Generate or regenerate the taste profile using Gemini. Two layers of limiting:
1. **Edge rate limiter** (Upstash): 10 req/hr per IP.
2. **Per-user cooldown** (route-level): `TASTE_PROFILE_COOLDOWN_MS` between
   successful generations; returns `429` if within the window.

**Error responses**
- `400` — fewer than 3 ratings
- `429` — within cooldown window
- `503` — Gemini unavailable

**Response** `{ "profile": { ... } }` (same shape as GET)

---

## Quiz

### `GET /api/quiz`
Auth: ✓ · Rate limit: general (300/hr)

Fetches a set of quiz items (movies + TV) excluding titles the user has already
rated, watched, or dismissed. Four parallel TMDB buckets (trending + acclaimed
× movie + TV) interleaved and deduplicated using composite
`${tmdbId}-${tmdbType}` keys.

**Response**
```json
{ "items": [ { "id": 12345, "type": "movie", "title": "...", "year": "2022", "posterPath": "/..." } ] }
```

---

### `POST /api/quiz`
Auth: ✓ · Rate limit: general (300/hr)

Submit quiz answers. Inserts new ratings only; skips items already rated.
Invalidates feed cache if any new ratings are inserted.

**Request body**
```json
{
  "answers": [
    { "tmdbId": 12345, "tmdbType": "movie", "title": "...", "posterPath": "/...", "verdict": "like" }
  ]
}
```

`"like"` → `QUIZ_LIKE_RATING`, `"dislike"` → `QUIZ_DISLIKE_RATING` (constants in
`src/lib/config/`). Skipped items (no verdict) are omitted by the client.

**Response** `{ "ok": true, "inserted": 5 }`

---

## Feed Actions

### `POST /api/feed/dismiss`
Auth: ✓ · Rate limit: general (300/hr)

Dismiss a feed card. Adds to `dismissed_items` to permanently exclude the title
from future feeds. Does **not** invalidate the feed cache (dismissed item is
filtered client-side immediately).

**Request body** `{ "tmdbId": 12345, "tmdbType": "movie" }`

**Response** `{ "ok": true }`

---

## Platforms & Vibe Tags

### `GET /api/platforms`
Auth: ✓ · Rate limit: general (300/hr)

Returns the user's configured streaming platforms.

### `POST /api/platforms`
Auth: ✓

Add a platform. **Request body** `{ "platformSlug": "netflix", "platformName": "Netflix", "platformType": "paid" }`

### `DELETE /api/platforms`
Auth: ✓

Remove a platform. **Request body** `{ "platformSlug": "netflix" }`

---

### `GET /api/vibe-tags`
Auth: ✓

Returns the user's vibe tags.

### `POST /api/vibe-tags`
Auth: ✓

**Request body** `{ "tag": "cozy" }`

### `DELETE /api/vibe-tags`
Auth: ✓

**Request body** `{ "tag": "cozy" }`

---

## User

### `GET /api/user/preferences`
Auth: ✓

Returns `country`, `contentLanguage`, `preferCaptions`.

### `POST /api/user/preferences`
Auth: ✓

Update user preferences. **Request body** — any subset of the above fields.

---

### `DELETE /api/user`
Auth: ✓ · Rate limit: general (300/hr)

**Permanently deletes the account and all associated data.** Explicit deletes
are issued for each table (only `accounts` has `ON DELETE CASCADE` from `users`;
all others are manual):

`importHistory` → `feedCache` → `vibeTags` → `userPlatforms` → `tasteProfile`
→ `dismissedItems` → `watched` → `watchlist` → `ratings` → `users`

**Response** `{ "ok": true }`

The client is responsible for signing the user out after a successful response.

---

## Auth

### `GET|POST /api/auth/[...nextauth]`
Public · No rate limit

NextAuth OAuth endpoints — callback, CSRF, session, sign-in, sign-out. Handled
entirely by the NextAuth library. Not documented here; see the
[NextAuth docs](https://authjs.dev/).

---

## TMDB Passthrough

Internal routes that proxy TMDB directly. Used by the client for search
autocomplete and quiz seeding.

### `GET /api/tmdb/search`
Auth: ✓ · Rate limit: general (300/hr)

Raw TMDB `searchMulti` passthrough. Used for rating-search autocomplete.

**Query params**
- `q` — search string

**Response** `{ "results": [ /* raw TMDB multi-search result objects */ ] }`

---

### `GET /api/tmdb/seed-movies`
Auth: ✓ · Rate limit: general (300/hr)

Trending movies with genres attached. Used to seed the initial rating quiz.

**Response** `{ "movies": [ /* TmdbMovie[] with genres array */ ] }`

---

## Admin

### `POST /api/admin/seed-platforms`
Auth: ✓ (same JWT gate — no additional role check)

Seeds the `platforms` table from `PLATFORM_REGISTRY`. Dev/admin use only.
Not linked from the UI.

---

### `POST /api/admin/sync-catalog`
Auth: ✓ + session email must match `ADMIN_EMAIL` + `x-sync-secret` header must equal `CATALOG_SYNC_SECRET`
Rate limit: general (300/hr)

Fans out a streaming catalog sync across all platforms in parallel. For each
platform, fetches current titles from MOTN or Watchmode, upserts `media` rows,
and replaces `mediaLinks`. Clears all `feedCache` rows on success so users
receive fresh recommendations.

**Query params**
- `slug` — optional; restrict sync to a single platform (e.g. `?slug=netflix`)

**Headers**
- `x-sync-secret: <value of CATALOG_SYNC_SECRET>`

**Response**
```json
{ "synced": 1250, "platforms": { "netflix": 100, "prime": 98, "tubi": 100, "...": "..." } }
```

Returns `401` if unauthenticated, `403` if authenticated but not `ADMIN_EMAIL`,
`401` if the secret header is wrong.
