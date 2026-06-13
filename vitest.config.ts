import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      // Modules under test transitively import lib/db, whose neon() client is
      // built at module load and only requires a connection string to *exist*
      // (it never connects — tests don't touch the DB). Placeholder DSN, no
      // real secret. gitleaks:allow
      DATABASE_URL: "postgres://user:pass@localhost:5432/test",
    },
  },
  resolve: {
    // Mirror tsconfig's "@/* -> ./src/*" so tests can import via the alias.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
