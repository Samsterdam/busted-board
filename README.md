# Busted Board

Personalized movie recommendations scoped to the streaming services you actually subscribe to. Rate what you've seen, let Gemini learn your taste, and get a ranked feed of what to watch next — filtered to Netflix, Hulu, Prime, or any other platform you've added.

**Live:** [busted-board.vercel.app](https://busted-board.vercel.app)

---

## Stack

- **Next.js 16** (App Router) · **TypeScript** · **Tailwind CSS**
- **Drizzle ORM** · **Neon PostgreSQL** (serverless)
- **Upstash Redis** (rate limiting)
- **Google Gemini** (taste profile + feed ranking)
- **TMDB API** (metadata, images, streaming providers)
- **NextAuth v5** (Google OAuth)
- **Vercel** (hosting + CI/CD)

---

## Local Setup

### Prerequisites

- Node.js 20+
- A Neon PostgreSQL project
- TMDB and Gemini API keys (minimum to run)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Copy the env template and fill in your values
# See docs/ENV.md for every variable and where to get it
cp .env.local.example .env.local   # or create .env.local manually

# 3. Apply the database schema
npm run db:migrate

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Documentation

- [**Architecture**](docs/ARCHITECTURE.md) — system overview, request lifecycle, recommendation engine, schema, caching
- [**Environment Variables**](docs/ENV.md) — every env var, where to get it, Vercel setup checklist
- [**API Reference**](docs/API.md) — all routes, request/response shapes, auth model
- [**Security**](docs/SECURITY.md) — auth, rate limiting, secret scanning, known gaps
- [**Journal**](docs/JOURNAL.md) — session-by-session change log and decision record
