import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./lib/db/schema/index.ts",
  out: "./lib/db/migrations",
});
