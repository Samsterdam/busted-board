import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    // Mirror tsconfig's "@/* -> ./src/*" so tests can import via the alias.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
