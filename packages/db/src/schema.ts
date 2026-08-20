import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const interests = sqliteTable("interests", {
  id: text("id").primaryKey(),
  topic: text("topic").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const podcasts = sqliteTable("podcasts", {
  id: text("id").primaryKey(),
  topic: text("topic").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  progress: integer("progress").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(1),
  transcriptIterations: integer("transcript_iterations").notNull(),
  qualityScore: integer("quality_score"),
  transcript: text("transcript"),
  sources: text("sources"),
  report: text("report"),
  article: text("article"),
  audioPath: text("audio_path"),
  scheduledFor: integer("scheduled_for", { mode: "timestamp_ms" }),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export type Podcast = typeof podcasts.$inferSelect;
