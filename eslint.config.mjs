import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Next 16 removed `next lint` and the `eslint` next.config option — lint runs
// through the ESLint CLI on this flat config. core-web-vitals = Next/React/Hooks
// rules with CWV rules promoted to errors; typescript = typescript-eslint rules.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-plugin-react-hooks v6 ships stricter rules that flag long-standing,
    // intentional patterns in this codebase (mount-gated ad/consent components,
    // a deliberate window hand-off in VibePicker). They're real smells worth
    // revisiting, but not bugs and not this PR's job — keep them visible as
    // warnings instead of blocking CI on pre-existing code. Tracked for follow-up.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "drizzle/**", // generated migration SQL + meta snapshots
  ]),
]);

export default eslintConfig;
