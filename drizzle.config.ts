import { defineConfig } from "drizzle-kit";
import path from "path";

export default defineConfig({
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: path.join(process.cwd(), "local.db"),
  },
});
