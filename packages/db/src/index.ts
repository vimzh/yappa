import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

export * from "./schema";

const filename = process.env.DB_FILE ?? resolve(import.meta.dir, "../../../data/yappa.db");

mkdirSync(dirname(filename), { recursive: true });

export const sqlite = new Database(filename, { create: true });
export const db = drizzle(sqlite);
