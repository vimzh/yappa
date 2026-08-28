import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  googleSubject: text("google_subject").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  picture: text("picture"),
  voiceAId: text("voice_a_id"),
  voiceBId: text("voice_b_id"),
  podcastInclude: text("podcast_include"),
  podcastAvoid: text("podcast_avoid"),
  freeGenerationsUsed: integer("free_generations_used").notNull().default(0),
  unlimitedGenerations: integer("unlimited_generations", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const interests = sqliteTable(
  "interests",
  {
    id: text("id").primaryKey(),
    // Nullable during the one-time migration so existing local records are preserved.
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("interests_user_topic_unique").on(table.userId, table.topic)],
);

export const podcasts = sqliteTable("podcasts", {
  id: text("id").primaryKey(),
  // Nullable during the one-time migration so existing local records are preserved.
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  progress: integer("progress").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(1),
  voiceAId: text("voice_a_id"),
  voiceBId: text("voice_b_id"),
  podcastInclude: text("podcast_include"),
  podcastAvoid: text("podcast_avoid"),
  transcriptIterations: integer("transcript_iterations").notNull(),
  qualityScore: integer("quality_score"),
  transcript: text("transcript"),
  sources: text("sources"),
  report: text("report"),
  article: text("article"),
  audioPath: text("audio_path"),
  openaiInputTokens: integer("openai_input_tokens").notNull().default(0),
  openaiCachedInputTokens: integer("openai_cached_input_tokens")
    .notNull()
    .default(0),
  openaiOutputTokens: integer("openai_output_tokens").notNull().default(0),
  openaiReasoningTokens: integer("openai_reasoning_tokens").notNull().default(0),
  openaiWebSearchCalls: integer("openai_web_search_calls").notNull().default(0),
  openaiMeteredCalls: integer("openai_metered_calls").notNull().default(0),
  openaiUnpricedCalls: integer("openai_unpriced_calls").notNull().default(0),
  openaiCostNanoUsd: integer("openai_cost_nano_usd").notNull().default(0),
  fishInputBytes: integer("fish_input_bytes").notNull().default(0),
  fishTtsRequests: integer("fish_tts_requests").notNull().default(0),
  fishUnpricedRequests: integer("fish_unpriced_requests").notNull().default(0),
  fishCostNanoUsd: integer("fish_cost_nano_usd").notNull().default(0),
  scheduledFor: integer("scheduled_for", { mode: "timestamp_ms" }),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export type Podcast = typeof podcasts.$inferSelect;
