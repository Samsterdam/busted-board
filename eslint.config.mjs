import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Next 16 removed `next lint` and the `eslint` next.config option — lint runs
// through the ESLint CLI on this flat config. core-web-vitals = Next/React/Hooks
// rules with CWV rules promoted to errors; typescript = typescript-eslint rules.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "drizzle/**", // generated migration SQL + meta snapshots
  ]),
]);

export default eslintConfig;
