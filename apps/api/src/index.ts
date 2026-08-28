import { db, interests, podcasts, users } from "@yappa/db";
import { and, asc, desc, eq, inArray, lt, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

import { answerArticleQuestion, generateLearningArticle } from "./article";
import { parseByteRange } from "./audio-range";
import { recordOpenAIUsage, summarizeCosts, toPodcastCost } from "./costs";
import { generatePodcastTopicSuggestions } from "./interest-topics";
import { removePodcastArtifacts, runPodcastGeneration } from "./debate/pipeline";
import {
  podcastStatuses,
  sourceSchema,
  transcriptSchema,
} from "./debate/schemas";
import { getPodcastSchedule } from "./podcast-schedule";
import {
  freeGenerationLimit,
  toGenerationQuota,
} from "./generation-quota";
import { finishGoogleOAuth, getAuthUser, signOut, startGoogleOAuth, type AuthUser } from "./auth";
import {
  isVoiceAId,
  isVoiceBId,
  resolveVoiceIds,
  voiceAOptions,
  voiceBOptions,
  type DebateVoiceIds,
} from "./debate/voice-catalog";

const createPodcastSchema = z.object({
  topic: z.string().trim().min(8).max(240).optional(),
  durationMinutes: z.union([
    z.literal(1),
    z.literal(3),
    z.literal(5),
  ]).default(1),
  maxIterations: z.number().int().min(1).max(3).default(2),
  scheduledFor: z.string().datetime({ offset: true }).optional(),
});

const createInterestSchema = z.object({
  topic: z.string().trim().min(2).max(80),
});

const createInterestsSchema = z.object({
  topics: z.array(z.string().trim().min(2).max(80)).min(1).max(20),
});

const voiceSettingsSchema = z.object({
  voiceAId: z.string(),
  voiceBId: z.string(),
  podcastInclude: z.string().trim().max(1_000).default(""),
  podcastAvoid: z.string().trim().max(1_000).default(""),
});

const articleQuestionSchema = z.object({
  question: z.string().trim().min(8).max(400),
  passage: z.string().trim().min(20).max(2_000),
});

const articlePassagesSchema = z.object({
  sections: z.array(
    z.object({ paragraphs: z.array(z.object({ text: z.string() })) }),
  ),
});

const activeJobs = new Set<string>();
const activeArticleJobs = new Set<string>();
const allowedWebOrigins = new Set([
  process.env.WEB_ORIGIN ?? "http://localhost:3000",
  "http://localhost:3000",
  "http://localhost:5050",
]);
const defaultTranscriptIterations = 2;
const configuredConcurrency = Number.parseInt(
  process.env.MAX_CONCURRENT_PODCASTS ?? "1",
  10,
);
const maxConcurrentPodcasts = Number.isFinite(configuredConcurrency)
  ? Math.max(1, configuredConcurrency)
  : 1;

const interruptedStatuses = podcastStatuses.filter(
  (status) => !["scheduled", "queued", "ready", "failed"].includes(status),
);

db.update(podcasts)
  .set({
    status: "failed",
    error: "Generation was interrupted by an API restart. Create it again.",
    updatedAt: new Date(),
  })
  .where(inArray(podcasts.status, interruptedStatuses))
  .run();

function toPodcastSummary(podcast: typeof podcasts.$inferSelect) {
  return {
    id: podcast.id,
    topic: podcast.topic,
    title: podcast.title,
    status: podcast.status,
    progress: podcast.progress,
    durationMinutes: podcast.durationMinutes,
    transcriptIterations: podcast.transcriptIterations,
    qualityScore: podcast.qualityScore,
    error: podcast.error,
    hasAudio: podcast.status === "ready" && Boolean(podcast.audioPath),
    hasArticle: Boolean(podcast.article),
    cost: toPodcastCost(podcast),
    scheduledFor: podcast.scheduledFor?.toISOString() ?? null,
    createdAt: podcast.createdAt.toISOString(),
    updatedAt: podcast.updatedAt.toISOString(),
  };
}

function toPublicPodcastSummary(podcast: typeof podcasts.$inferSelect) {
  const { cost: _cost, ...summary } = toPodcastSummary(podcast);
  return summary;
}

function parseStoredJson(value: string | null) {
  return value ? JSON.parse(value) : null;
}

function startPodcastJob(options: {
  id: string;
  topic: string;
  durationMinutes: number;
  maxIterations: number;
  voiceIds: DebateVoiceIds;
  include: string | null;
  avoid: string | null;
}) {
  activeJobs.add(options.id);

  // ponytail: in-process jobs are enough locally; use a durable queue before multi-instance deploys.
  void runPodcastGeneration(options)
    .catch(async (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Podcast generation failed.";
      console.error("Podcast generation failed", { id: options.id, message });
      await db
        .update(podcasts)
        .set({ status: "failed", error: message, updatedAt: new Date() })
        .where(eq(podcasts.id, options.id));
    })
    .finally(() => activeJobs.delete(options.id));
}

async function startScheduledPodcasts() {
  const availableSlots = maxConcurrentPodcasts - activeJobs.size;
  if (availableSlots <= 0) return;

  const scheduled = await db
    .select()
    .from(podcasts)
    .where(
      and(
        eq(podcasts.status, "scheduled"),
        lte(podcasts.scheduledFor, new Date()),
      ),
    )
    .orderBy(asc(podcasts.scheduledFor))
    .limit(availableSlots);

  for (const podcast of scheduled) {
    if (!activeJobs.has(podcast.id)) {
      startPodcastJob({
        id: podcast.id,
        topic: podcast.topic,
        durationMinutes: podcast.durationMinutes,
        maxIterations: defaultTranscriptIterations,
        voiceIds: resolveVoiceIds(podcast),
        include: podcast.podcastInclude,
        avoid: podcast.podcastAvoid,
      });
    }
  }
}

void startScheduledPodcasts();
setInterval(() => void startScheduledPodcasts(), 10_000).unref();

type AppVariables = { user: AuthUser };

export const app = new Hono<{ Variables: AppVariables }>()
  .use(
    "*",
    cors({
      origin: (origin) => (allowedWebOrigins.has(origin) ? origin : undefined),
      credentials: true,
    }),
  )
  .use("*", async (context, next) => {
    const publicPodcastRead =
      context.req.method === "GET" &&
      (/^\/podcasts\/[a-zA-Z0-9-]+(?:\/audio)?$/.test(context.req.path) ||
        context.req.path === "/podcasts");
    if (
      ["/", "/health", "/auth/google", "/auth/google/callback"].includes(context.req.path) ||
      publicPodcastRead
    ) {
      return next();
    }

    const user = await getAuthUser(context);
    if (!user) return context.json({ error: "Sign in to continue." }, 401);
    context.set("user", user);
    return next();
  })
  .get("/", (context) => context.json({ service: "yappa-api" }))
  .get("/health", (context) => {
    db.run(sql`select 1`);
    return context.json({ status: "ok", database: "sqlite" });
  })
  .get("/auth/google", (context) => {
    try {
      return startGoogleOAuth(context);
    } catch {
      return context.json({ error: "Google OAuth is not configured." }, 503);
    }
  })
  .get("/auth/google/callback", async (context) => {
    try {
      await finishGoogleOAuth(context);
      return context.redirect(new URL("/home", process.env.WEB_ORIGIN ?? "http://localhost:3000").toString());
    } catch (error) {
      console.error("Google OAuth failed", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return context.redirect(new URL("/?auth=oauth", process.env.WEB_ORIGIN ?? "http://localhost:3000").toString());
    }
  })
  .get("/auth/me", (context) => {
    const user = context.get("user");
    return context.json({ id: user.id, email: user.email, name: user.name, picture: user.picture });
  })
  .post("/auth/logout", async (context) => {
    await signOut(context);
    return new Response(null, { status: 204 });
  })
  .get("/settings/voices", (context) => {
    const user = context.get("user");
    const [voiceAId, voiceBId] = resolveVoiceIds(user);
    return context.json({
      voiceAId,
      voiceBId,
      podcastInclude: user.podcastInclude ?? "",
      podcastAvoid: user.podcastAvoid ?? "",
      options: { voiceA: voiceAOptions, voiceB: voiceBOptions },
    });
  })
  .put("/settings/voices", async (context) => {
    const user = context.get("user");
    let body: unknown;
    try {
      body = await context.req.json();
    } catch {
      return context.json({ error: "Send a JSON body with your podcast preferences." }, 400);
    }

    const parsed = voiceSettingsSchema.safeParse(body);
    if (
      !parsed.success ||
      !isVoiceAId(parsed.data.voiceAId) ||
      !isVoiceBId(parsed.data.voiceBId)
    ) {
      return context.json({ error: "Choose one available voice for each speaker." }, 400);
    }

    await db
      .update(users)
      .set({
        voiceAId: parsed.data.voiceAId,
        voiceBId: parsed.data.voiceBId,
        podcastInclude: parsed.data.podcastInclude || null,
        podcastAvoid: parsed.data.podcastAvoid || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return context.json({
      ...parsed.data,
      options: { voiceA: voiceAOptions, voiceB: voiceBOptions },
    });
  })
  .get("/interests", async (context) => {
    const user = context.get("user");
    const rows = await db.select().from(interests).where(eq(interests.userId, user.id)).orderBy(asc(interests.createdAt));
    return context.json(
      rows.map((interest) => ({
        ...interest,
        createdAt: interest.createdAt.toISOString(),
      })),
    );
  })
  .post("/interests", async (context) => {
    const user = context.get("user");
    let body: unknown;
    try {
      body = await context.req.json();
    } catch {
      return context.json({ error: "Send a JSON body with a topic." }, 400);
    }

    const parsed = createInterestSchema.safeParse(body);
    if (!parsed.success) {
      return context.json(
        { error: "Interest must be between 2 and 80 characters." },
        400,
      );
    }

    const [existing] = await db
      .select({ id: interests.id })
      .from(interests)
      .where(and(eq(interests.userId, user.id), eq(interests.topic, parsed.data.topic)))
      .limit(1);
    if (existing) {
      return context.json({ error: "That interest already exists." }, 409);
    }

    const interest = {
      id: crypto.randomUUID(),
      userId: user.id,
      topic: parsed.data.topic,
      createdAt: new Date(),
    };
    await db.insert(interests).values(interest);
    return context.json(
      { ...interest, createdAt: interest.createdAt.toISOString() },
      201,
    );
  })
  .post("/interests/batch", async (context) => {
    const user = context.get("user");
    let body: unknown;
    try {
      body = await context.req.json();
    } catch {
      return context.json({ error: "Send a JSON body with a list of interests." }, 400);
    }

    const parsed = createInterestsSchema.safeParse(body);
    if (!parsed.success) {
      return context.json(
        { error: "Add between 1 and 20 interests, each between 2 and 80 characters." },
        400,
      );
    }

    const saved = await db
      .select({ topic: interests.topic })
      .from(interests)
      .where(eq(interests.userId, user.id));
    const existing = new Set(saved.map((interest) => interest.topic.toLocaleLowerCase()));
    const unique = new Map<string, string>();
    for (const topic of parsed.data.topics) {
      const key = topic.toLocaleLowerCase();
      if (!existing.has(key) && !unique.has(key)) unique.set(key, topic);
    }

    const now = new Date();
    const rows = [...unique.values()].map((topic) => ({
      id: crypto.randomUUID(),
      userId: user.id,
      topic,
      createdAt: now,
    }));
    if (rows.length > 0) await db.insert(interests).values(rows);

    return context.json(
      rows.map((interest) => ({
        ...interest,
        createdAt: interest.createdAt.toISOString(),
      })),
      201,
    );
  })
  .post("/interests/suggestions", async (context) => {
    const user = context.get("user");
    const saved = await db
      .select({ topic: interests.topic })
      .from(interests)
      .where(eq(interests.userId, user.id))
      .orderBy(asc(interests.createdAt));
    if (saved.length === 0) {
      return context.json({ error: "Add at least one interest before generating topics." }, 400);
    }

    try {
      return context.json(
        await generatePodcastTopicSuggestions(saved.map((interest) => interest.topic)),
      );
    } catch (error) {
      console.error("Podcast topic generation failed", {
        userId: user.id,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return context.json({ error: "Podcast topics could not be generated. Try again." }, 502);
    }
  })
  .delete("/interests/:id", async (context) => {
    const user = context.get("user");
    const deleted = await db
      .delete(interests)
      .where(and(eq(interests.id, context.req.param("id")), eq(interests.userId, user.id)))
      .returning({ id: interests.id });
    if (deleted.length === 0) {
      return context.json({ error: "Interest not found." }, 404);
    }
    return new Response(null, { status: 204 });
  })
  .get("/podcasts", async (context) => {
    const rows = await db.select().from(podcasts).orderBy(desc(podcasts.createdAt));
    return context.json(rows.map(toPublicPodcastSummary));
  })
  .get("/costs", async (context) => {
    const user = context.get("user");
    const rows = await db.select().from(podcasts).where(eq(podcasts.userId, user.id)).orderBy(desc(podcasts.createdAt));
    return context.json({
      totals: summarizeCosts(rows),
      podcasts: rows.map((podcast) => ({
        id: podcast.id,
        title: podcast.title,
        status: podcast.status,
        createdAt: podcast.createdAt.toISOString(),
        cost: toPodcastCost(podcast),
      })),
    });
  })
  .get("/generation-quota", (context) => {
    const user = context.get("user");
    return context.json(toGenerationQuota(user.freeGenerationsUsed, user.unlimitedGenerations));
  })
  .delete("/podcasts/:id", async (context) => {
    const user = context.get("user");
    const id = context.req.param("id");
    if (activeJobs.has(id) || activeArticleJobs.has(id)) {
      return context.json(
        { error: "A generating podcast cannot be deleted yet." },
        409,
      );
    }

    const [podcast] = await db
      .select({ id: podcasts.id })
      .from(podcasts)
      .where(and(eq(podcasts.id, id), eq(podcasts.userId, user.id)))
      .limit(1);
    if (!podcast) {
      return context.json({ error: "Podcast not found." }, 404);
    }

    await removePodcastArtifacts(id);
    await db.delete(podcasts).where(and(eq(podcasts.id, id), eq(podcasts.userId, user.id)));
    return new Response(null, { status: 204 });
  })
  .post("/podcasts", async (context) => {
    const user = context.get("user");
    let body: unknown;
    try {
      body = await context.req.json();
    } catch {
      return context.json({ error: "Send a JSON body with a topic." }, 400);
    }

    const parsed = createPodcastSchema.safeParse(body);
    if (!parsed.success) {
      const invalidDuration = parsed.error.issues.some(
        (issue) => issue.path[0] === "durationMinutes",
      );
      return context.json(
        {
          error: invalidDuration
            ? "Episode length must be 1, 3, or 5 minutes."
            : "Topic must be between 8 and 240 characters.",
        },
        400,
      );
    }

    const schedule = getPodcastSchedule(parsed.data.scheduledFor);
    let topic = parsed.data.topic;

    if (!topic) {
      if (schedule.shouldStart) {
        return context.json(
          { error: "Describe the debate before creating it now." },
          400,
        );
      }

      const [interest] = await db
        .select({ topic: interests.topic })
        .from(interests)
        .where(eq(interests.userId, user.id))
        .orderBy(desc(interests.createdAt))
        .limit(1);
      if (!interest) {
        return context.json(
          { error: "Save an interest before scheduling a podcast without a topic." },
          400,
        );
      }

      topic = `Debate the key trade-offs in ${interest.topic}.`;
    }

    if (schedule.shouldStart && activeJobs.size >= maxConcurrentPodcasts) {
      return context.json(
        { error: "A podcast is already generating. Wait for it to finish." },
        409,
      );
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const voiceIds = resolveVoiceIds(user);
    const podcast = {
      id,
      userId: user.id,
      topic,
      title: topic,
      status: schedule.status,
      progress: schedule.progress,
      durationMinutes: parsed.data.durationMinutes,
      voiceAId: voiceIds[0],
      voiceBId: voiceIds[1],
      podcastInclude: user.podcastInclude,
      podcastAvoid: user.podcastAvoid,
      transcriptIterations: 0,
      qualityScore: null,
      transcript: null,
      sources: null,
      report: null,
      article: null,
      audioPath: null,
      openaiInputTokens: 0,
      openaiCachedInputTokens: 0,
      openaiOutputTokens: 0,
      openaiReasoningTokens: 0,
      openaiWebSearchCalls: 0,
      openaiMeteredCalls: 0,
      openaiUnpricedCalls: 0,
      openaiCostNanoUsd: 0,
      fishInputBytes: 0,
      fishTtsRequests: 0,
      fishUnpricedRequests: 0,
      fishCostNanoUsd: 0,
      scheduledFor: schedule.scheduledFor,
      error: null,
      createdAt: now,
      updatedAt: now,
    };

    const quota = db.transaction((transaction) => {
      if (user.unlimitedGenerations) {
        transaction.insert(podcasts).values(podcast).run();
        return toGenerationQuota(user.freeGenerationsUsed, true);
      }

      const consumed = transaction
        .update(users)
        .set({
          freeGenerationsUsed: sql`${users.freeGenerationsUsed} + 1`,
          updatedAt: now,
        })
        .where(
          and(
            eq(users.id, user.id),
            lt(users.freeGenerationsUsed, freeGenerationLimit),
          ),
        )
        .returning({ used: users.freeGenerationsUsed })
        .get();
      if (!consumed) return null;

      transaction.insert(podcasts).values(podcast).run();
      return toGenerationQuota(consumed.used);
    });
    if (!quota) {
      return context.json(
        {
          error: "You have used all three free podcast generations.",
          quota: toGenerationQuota(freeGenerationLimit),
        },
        403,
      );
    }
    if (schedule.shouldStart) {
      startPodcastJob({
        id,
        topic,
        durationMinutes: parsed.data.durationMinutes,
        maxIterations: parsed.data.maxIterations,
        voiceIds,
        include: user.podcastInclude,
        avoid: user.podcastAvoid,
      });
    } else {
      void startScheduledPodcasts();
    }

    return context.json({ ...toPodcastSummary(podcast), quota }, 202);
  })
  .post("/podcasts/:id/retry", async (context) => {
    const user = context.get("user");
    if (activeJobs.size >= maxConcurrentPodcasts) {
      return context.json(
        { error: "A podcast is already generating. Wait for it to finish." },
        409,
      );
    }

    const [podcast] = await db
      .select()
      .from(podcasts)
      .where(and(eq(podcasts.id, context.req.param("id")), eq(podcasts.userId, user.id)))
      .limit(1);

    if (!podcast) {
      return context.json({ error: "Podcast not found." }, 404);
    }

    if (podcast.status !== "failed") {
      return context.json({ error: "Only failed podcasts can be retried." }, 409);
    }

    const retried = {
      ...podcast,
      status: "queued",
      progress: 4,
      error: null,
      updatedAt: new Date(),
    };
    await db
      .update(podcasts)
      .set({
        status: retried.status,
        progress: retried.progress,
        error: retried.error,
        updatedAt: retried.updatedAt,
      })
      .where(and(eq(podcasts.id, podcast.id), eq(podcasts.userId, user.id)));

    startPodcastJob({
      id: podcast.id,
      topic: podcast.topic,
      durationMinutes: podcast.durationMinutes,
      maxIterations: defaultTranscriptIterations,
      voiceIds: resolveVoiceIds(podcast),
      include: podcast.podcastInclude,
      avoid: podcast.podcastAvoid,
    });
    return context.json(toPodcastSummary(retried), 202);
  })
  .get("/podcasts/:id/audio", async (context) => {
    const [podcast] = await db
      .select({ status: podcasts.status, audioPath: podcasts.audioPath })
      .from(podcasts)
      .where(eq(podcasts.id, context.req.param("id")))
      .limit(1);

    if (!podcast?.audioPath || podcast.status !== "ready") {
      return context.json({ error: "Audio is not ready." }, 404);
    }

    const file = Bun.file(podcast.audioPath);
    if (!(await file.exists())) {
      return context.json({ error: "Audio file is missing." }, 404);
    }

    const range = parseByteRange(context.req.header("range"), file.size);
    const headers = {
      "Accept-Ranges": "bytes",
      "Content-Type": "audio/mpeg",
      "Content-Disposition": `inline; filename="${context.req.param("id")}.mp3"`,
      "Cache-Control": "private, max-age=3600",
    };

    if (range === "invalid") {
      return new Response(null, {
        status: 416,
        headers: { ...headers, "Content-Range": `bytes */${file.size}` },
      });
    }

    if (range) {
      // ponytail: previews are short; switch to ranged file streams for full episodes.
      const audio = await file.arrayBuffer();
      return new Response(audio.slice(range.start, range.end + 1), {
        status: 206,
        headers: {
          ...headers,
          "Content-Length": String(range.end - range.start + 1),
          "Content-Range": `bytes ${range.start}-${range.end}/${file.size}`,
        },
      });
    }

    return new Response(file, {
      headers: { ...headers, "Content-Length": String(file.size) },
    });
  })
  .post("/podcasts/:id/article", async (context) => {
    const user = context.get("user");
    const id = context.req.param("id");
    const [podcast] = await db
      .select()
      .from(podcasts)
      .where(and(eq(podcasts.id, id), eq(podcasts.userId, user.id)))
      .limit(1);

    if (!podcast) {
      return context.json({ error: "Podcast not found." }, 404);
    }
    if (podcast.article) {
      return context.json(parseStoredJson(podcast.article));
    }
    if (activeArticleJobs.has(id)) {
      return context.json({ error: "The article is already generating." }, 409);
    }
    if (podcast.status !== "ready" || !podcast.transcript || !podcast.sources) {
      return context.json(
        { error: "The article is available after the podcast is verified." },
        409,
      );
    }

    const transcript = transcriptSchema.safeParse(
      parseStoredJson(podcast.transcript),
    );
    const sources = z.array(sourceSchema).safeParse(parseStoredJson(podcast.sources));
    if (!transcript.success || !sources.success) {
      return context.json(
        { error: "Podcast research is incomplete; article cannot be generated." },
        409,
      );
    }

    activeArticleJobs.add(id);
    try {
      const article = await generateLearningArticle({
        topic: podcast.topic,
        transcript: transcript.data,
        sources: sources.data,
        onUsage: (usage) => recordOpenAIUsage(id, usage),
      });
      await db
        .update(podcasts)
        .set({ article: JSON.stringify(article), updatedAt: new Date() })
        .where(and(eq(podcasts.id, id), eq(podcasts.userId, user.id)));
      return context.json(article, 201);
    } catch (error) {
      console.error("Article generation failed", {
        id,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return context.json({ error: "Article generation failed. Try again." }, 502);
    } finally {
      activeArticleJobs.delete(id);
    }
  })
  .post("/podcasts/:id/article/questions", async (context) => {
    const user = context.get("user");
    const id = context.req.param("id");
    let body: unknown;
    try {
      body = await context.req.json();
    } catch {
      return context.json({ error: "Send a question about the selected passage." }, 400);
    }

    const parsed = articleQuestionSchema.safeParse(body);
    if (!parsed.success) {
      return context.json(
        { error: "Question must be 8-400 characters and reference a selected passage." },
        400,
      );
    }

    const [podcast] = await db
      .select()
      .from(podcasts)
      .where(and(eq(podcasts.id, id), eq(podcasts.userId, user.id)))
      .limit(1);
    if (!podcast) {
      return context.json({ error: "Podcast not found." }, 404);
    }
    if (!podcast.article || !podcast.transcript || !podcast.sources) {
      return context.json({ error: "Generate the verified article first." }, 409);
    }

    const article = articlePassagesSchema.safeParse(parseStoredJson(podcast.article));
    const passageBelongsToArticle = article.success && article.data.sections.some(
      (section) => section.paragraphs.some(
        (paragraph) => paragraph.text === parsed.data.passage,
      ),
    );
    if (!passageBelongsToArticle) {
      return context.json({ error: "Select a passage from this article." }, 400);
    }

    const transcript = transcriptSchema.safeParse(parseStoredJson(podcast.transcript));
    const sources = z.array(sourceSchema).safeParse(parseStoredJson(podcast.sources));
    if (!transcript.success || !sources.success) {
      return context.json({ error: "Podcast research is incomplete." }, 409);
    }

    try {
      const answer = await answerArticleQuestion({
        topic: podcast.topic,
        ...parsed.data,
        transcript: transcript.data,
        sources: sources.data,
        onUsage: (usage) => recordOpenAIUsage(id, usage),
      });
      return context.json(answer);
    } catch (error) {
      console.error("Article follow-up failed", {
        id,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return context.json({ error: "The debate could not answer that question. Try again." }, 502);
    }
  })
  .get("/podcasts/:id", async (context) => {
    const [podcast] = await db
      .select()
      .from(podcasts)
      .where(eq(podcasts.id, context.req.param("id")))
      .limit(1);

    if (!podcast) {
      return context.json({ error: "Podcast not found." }, 404);
    }

    return context.json({
      ...toPublicPodcastSummary(podcast),
      transcript: parseStoredJson(podcast.transcript),
      sources: parseStoredJson(podcast.sources),
      report: parseStoredJson(podcast.report),
      article: parseStoredJson(podcast.article),
    });
  });

export default {
  port: Number(process.env.PORT ?? 3101),
  fetch: app.fetch,
};
