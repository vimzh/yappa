import { defineConfig } from "drizzle-kit";
import { resolve } from "node:path";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DB_FILE ?? resolve(process.cwd(), "../../data/yappa.db"),
  },
});
