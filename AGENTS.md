<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## File length

- **Soft limit: 300 lines.** When a file crosses ~300 lines, stop and refactor — extract components, hooks, helpers, or types into their own files. Do not let it grow further without splitting.
- **Hard limit: 500 lines.** No file may exceed 500 lines. If a change would push a file past 500, split it first; a 500+ line file is a defect, not a style preference.
- These limits apply to source files (`.ts`, `.tsx`, `.js`, etc.). Generated files, lockfiles, and vendored code are exempt.
- Prefer many small, single-responsibility modules over few large ones. If splitting feels unnatural, that usually signals the file is doing too many things — split by responsibility, not by line count alone.

## No hard-coded values — centralize config

No magic values in code. Every literal that carries meaning must come from a named source.

- **Secrets, credentials, connection strings, API keys** → environment variables only. Never commit them; never inline them. Access through a single typed config module, not scattered `process.env.X` reads.
- **Reusable constants** (URLs, endpoints, timeouts, retry counts, limits, page sizes, cache TTLs, feature flags, colors, breakpoints, z-indexes, etc.) → defined once in a dedicated config/constants module and imported. If a value is used in 2+ places, it must be a named constant.
- **One-off literals** are allowed *only* when self-evident from context (e.g. `index + 1`, `array.length === 0`, an `aria-hidden="true"`). When in doubt, name it.
- Design tokens (colors, spacing, typography, radii) come from the design system / theme — do not hand-code hex values or pixel spacing in components.
- A literal that needs a comment to explain what it means should be a named constant whose name *is* the explanation.
- **Where shared constants live:** `src/lib/config/` — domain-split, dependency-free modules (`ads.ts`, `durations.ts`, `scoring.ts`, `feed.ts`, `ratings.ts`). `no-magic-numbers` is turned off there because naming literals is their job. Import from these instead of inlining. Genuinely single-use, file-local presentational counts may be a local `const NAME = <n>` at the top of the file instead.

## Enforcement & local setup

These rules are enforced mechanically — they are not just style guidance.

- **ESLint gate** (`eslint.config.mjs`, run via `npm run lint`):
  - `max-lines` → **error at 500 raw lines** (the hard limit), project-wide. The 300 soft limit stays advisory (one rule can only gate one threshold) — split proactively as you approach it.
  - `@typescript-eslint/no-magic-numbers` → **error** in `src/**`. Numbers in object-property position (`{ status: 401 }`) and lone `const NAME = <n>` initializers are allowed; literals in expressions/arguments/arrays are not. `src/lib/config/**` and `*.test.*` are exempt.
- **Pre-commit hook** (husky + lint-staged): auto-installs on `npm install` (via the `prepare` script). It runs ESLint on staged `*.{ts,tsx}` (errors block the commit) and then a gitleaks secret scan.
- **Secret scanning** (gitleaks): the hook warns-but-skips if the `gitleaks` binary isn't installed locally; **CI enforces it hard**. Install it locally with `winget install gitleaks` (or `scoop install gitleaks` / `brew install gitleaks`).
  - **False positive?** Add the path/regex to `.gitleaks.toml`'s `[allowlist]`, or put an inline `gitleaks:allow` comment on the offending line.
- **CI** (`.github/workflows/ci.yml`): typecheck → lint (the gate above) → migration-drift → test → build, plus a separate `secret-scan` job running gitleaks over full history.
