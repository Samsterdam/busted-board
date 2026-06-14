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

  // Hard file-length limit (raw lines, to match AGENTS.md's "500 lines"). The
  // soft 300 target stays advisory — one max-lines rule can only gate one
  // threshold. Applies to every linted file.
  {
    rules: {
      "max-lines": ["error", { max: 500, skipBlankLines: false, skipComments: false }],
    },
  },

  // No magic numbers in application logic — reusable values live in
  // src/lib/config/*. Object-property numbers (detectObjects:false) and lone
  // `const NAME = <n>` initializers are allowed; literals inside expressions,
  // arguments, and arrays are not.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-magic-numbers": [
        "error",
        {
          ignore: [-1, 0, 1, 2],
          detectObjects: false,
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignoreEnums: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true,
          ignoreNumericLiteralTypes: true,
        },
      ],
    },
  },

  // The config modules exist to name literals, and tests assert against literal
  // fixtures/expected values — so no-magic-numbers is off for both.
  {
    files: ["src/lib/config/**", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    rules: { "@typescript-eslint/no-magic-numbers": "off" },
  },
]);

export default eslintConfig;
