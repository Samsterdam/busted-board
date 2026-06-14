# Busted Board — Security & Authorization

## Authentication

**Provider:** Google OAuth 2.0 only (via NextAuth v5).
No username/password accounts exist — the only credential accepted is a
Google ID token.

**Session model:** JWT (stateless). NextAuth issues an HttpOnly, Secure,
SameSite cookie containing a signed JWT. No session table exists in the database.

**Edge / Node split:**
- `proxy.ts` (Edge Middleware) verifies the JWT cookie using `authConfig`
  (providers + callbacks only, no DB adapter). This keeps the Neon/Drizzle
  driver out of the edge bundle.
- `auth.ts` (Node runtime) adds the DrizzleAdapter for route handlers and
  server components that need to read/write user records.

**Protected routes:** every route except the list below requires a valid JWT.
Unauthenticated requests are redirected to `/login`. An authenticated user
hitting `/login` is redirected to `/`.

**Public routes (no auth required):**
```
/login
/api/auth/**          (OAuth callbacks)
/manifest.json
/_next/**             (static assets)
/favicon*
```

---

## Authorization

All API routes enforce authentication at the Edge (proxy.ts) before reaching
the handler. Route-level authorization:

- **Per-user data isolation:** every DB query filters by `session.user.id`. No
  route accepts a `userId` parameter from the client; the ID comes exclusively
  from the verified JWT.
- **No admin endpoints exposed publicly:** `/api/admin/**` routes exist but are
  not linked from the UI. They are protected by the same JWT gate.
- **No RBAC:** the app is single-role (all authenticated users are equal).
  Admin routes rely on the authentication gate and the assumption that only the
  developer has the credentials; they are not hardened for a multi-admin
  environment.

---

## Rate Limiting

Enforced in `proxy.ts` before the request reaches any API handler.
Implementation: Upstash Redis sliding-window counters, keyed by `<bucket>:<ip>`.

| Bucket | Route | Limit | Rationale |
|---|---|---|---|
| `taste` | `POST /api/taste-profile/analyze` | **10 req/hr** | Calls Gemini; expensive |
| `feed` | `GET /api/recommendations/feed` | **30 req/hr** | May call Gemini on cache miss |
| `general` | All other `/api/**` | **300 req/hr** | General abuse floor |

Rate-limited responses return HTTP `429` with a `Retry-After` header (seconds
until the window resets).

Rate limiting is **skipped entirely** when `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` are absent (local dev without Upstash). This is
intentional — the limiter degrades gracefully rather than blocking local work.

---

## HTTP Security Headers

Applied to **all routes** via `next.config.ts` (`source: "/(.*)"` matcher).

| Header | Value | Purpose |
|---|---|---|
| `X-Frame-Options` | `DENY` | Blocks clickjacking (iframe embedding) |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage to cross-origin |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Enforces HTTPS for 2 years; eligible for HSTS preload list |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables sensitive browser APIs |

No `Content-Security-Policy` header is currently set. Adding one is a meaningful
future hardening step, but requires auditing all inline scripts and external
origins first.

---

## Secret Management

- All secrets are environment variables — never committed to source.
- Accessed through a single typed config module; `process.env.X` reads are
  not scattered throughout the codebase.
- **Pre-commit hook** (husky + lint-staged) runs `gitleaks` secret scanning on
  every staged commit. The hook warns-but-skips if `gitleaks` is not installed
  locally; CI enforces it as a hard gate.
- **CI** runs `gitleaks` over full git history in a dedicated `secret-scan` job.
- **False positives** are suppressed via `.gitleaks.toml` allowlist or inline
  `gitleaks:allow` comments — never by disabling the scanner.

---

## Vulnerability Scanning

- **Snyk:** GitHub integration connected. Monitors `package.json` for known CVEs
  on every push. One active finding: `postcss` XSS (build-only path; marked
  ignored as it does not affect runtime).
- **Probely / Snyk ownership:** verification meta tag in `layout.tsx` (`<meta
  name="…" content="…">`).
- **OWASP ZAP:** manual DAST scan planned against production after each
  significant security change. Not yet automated in CI.

---

## Data Privacy

- **PII stored:** name, email, profile image URL (from Google OAuth). No
  passwords, phone numbers, or payment data.
- **Data retention:** no automated purge policy. Users can delete their account
  via settings, which cascades a delete to all associated rows.
- **Third-party data sharing:**
  - TMDB: receives tmdbId lookups (no user PII).
  - Gemini: receives user rating history (titles + star scores) as prompt input.
    No names or emails are included in Gemini prompts.
  - Upstash: receives IP-keyed counter strings only.

---

## Known Gaps / Future Work

| Gap | Risk | Notes |
|---|---|---|
| No CSP header | Medium | Adds XSS surface; planned hardening |
| Admin routes rely on auth gate only | Low | Acceptable for single-developer admin; harden before adding other admins |
| Google OAuth "unverified app" warning | Low UX | Submit for Google verification via Cloud Console |
| OWASP ZAP not in CI | Medium | Manual scans only; no continuous DAST |
