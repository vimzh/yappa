import { db, interests, podcasts } from "@yappa/db";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

import { generateLearningArticle } from "./article";
import { parseByteRange } from "./audio-range";
import { runPodcastGeneration } from "./debate/pipeline";
import {
  podcastStatuses,
  sourceSchema,
  transcriptSchema,
} from "./debate/schemas";
import { getPodcastSchedule } from "./podcast-schedule";

const createPodcastSchema = z.object({
  topic: z.string().trim().min(8).max(240),
  maxIterations: z.number().int().min(3).max(10).default(5),
  scheduledFor: z.string().datetime({ offset: true }).optional(),
});

const createInterestSchema = z.object({
  topic: z.string().trim().min(2).max(80),
});

const activeJobs = new Set<string>();
const activeArticleJobs = new Set<string>();
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
    transcriptIterations: podcast.transcriptIterations,
    qualityScore: podcast.qualityScore,
    error: podcast.error,
    hasAudio: podcast.status === "ready" && Boolean(podcast.audioPath),
    hasArticle: Boolean(podcast.article),
    scheduledFor: podcast.scheduledFor?.toISOString() ?? null,
    createdAt: podcast.createdAt.toISOString(),
    updatedAt: podcast.updatedAt.toISOString(),
  };
}

function parseStoredJson(value: string | null) {
  return value ? JSON.parse(value) : null;
}

function startPodcastJob(options: {
  id: string;
  topic: string;
  maxIterations: number;
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
    .where(eq(podcasts.status, "scheduled"))
    .orderBy(asc(podcasts.scheduledFor))
    .limit(availableSlots);

  for (const podcast of scheduled) {
    if (!activeJobs.has(podcast.id)) {
      startPodcastJob({ id: podcast.id, topic: podcast.topic, maxIterations: 5 });
    }
  }
}

void startScheduledPodcasts();
setInterval(() => void startScheduledPodcasts(), 10_000).unref();

export const app = new Hono()
  .use(
    "*",
    cors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000" }),
  )
  .get("/", (context) => context.json({ service: "yappa-api" }))
  .get("/health", (context) => {
    db.run(sql`select 1`);
    return context.json({ status: "ok", database: "sqlite" });
  })
  .get("/interests", async (context) => {
    const rows = await db.select().from(interests).orderBy(asc(interests.createdAt));
    return context.json(
      rows.map((interest) => ({
        ...interest,
        createdAt: interest.createdAt.toISOString(),
      })),
    );
  })
  .post("/interests", async (context) => {
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
      .where(eq(interests.topic, parsed.data.topic))
      .limit(1);
    if (existing) {
      return context.json({ error: "That interest already exists." }, 409);
    }

    const interest = {
      id: crypto.randomUUID(),
      topic: parsed.data.topic,
      createdAt: new Date(),
    };
    await db.insert(interests).values(interest);
    return context.json(
      { ...interest, createdAt: interest.createdAt.toISOString() },
      201,
    );
  })
  .delete("/interests/:id", async (context) => {
    const deleted = await db
      .delete(interests)
      .where(eq(interests.id, context.req.param("id")))
      .returning({ id: interests.id });
    if (deleted.length === 0) {
      return context.json({ error: "Interest not found." }, 404);
    }
    return new Response(null, { status: 204 });
  })
  .get("/podcasts", async (context) => {
    const rows = await db.select().from(podcasts).orderBy(desc(podcasts.createdAt));
    return context.json(rows.map(toPodcastSummary));
  })
  .post("/podcasts", async (context) => {
    let body: unknown;
    try {
      body = await context.req.json();
    } catch {
      return context.json({ error: "Send a JSON body with a topic." }, 400);
    }

    const parsed = createPodcastSchema.safeParse(body);
    if (!parsed.success) {
      return context.json(
        { error: "Topic must be between 8 and 240 characters." },
        400,
      );
    }

    const schedule = getPodcastSchedule(parsed.data.scheduledFor);

    if (schedule.shouldStart && activeJobs.size >= maxConcurrentPodcasts) {
      return context.json(
        { error: "A podcast is already generating. Wait for it to finish." },
        409,
      );
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const podcast = {
      id,
      topic: parsed.data.topic,
      title: parsed.data.topic,
      status: schedule.status,
      progress: schedule.progress,
      transcriptIterations: 0,
      qualityScore: null,
      transcript: null,
      sources: null,
      report: null,
      article: null,
      audioPath: null,
      scheduledFor: schedule.scheduledFor,
      error: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(podcasts).values(podcast);
    if (schedule.shouldStart) {
      startPodcastJob({
        id,
        topic: parsed.data.topic,
        maxIterations: parsed.data.maxIterations,
      });
    } else {
      void startScheduledPodcasts();
    }

    return context.json(toPodcastSummary(podcast), 202);
  })
  .post("/podcasts/:id/retry", async (context) => {
    if (activeJobs.size >= maxConcurrentPodcasts) {
      return context.json(
        { error: "A podcast is already generating. Wait for it to finish." },
        409,
      );
    }

    const [podcast] = await db
      .select()
      .from(podcasts)
      .where(eq(podcasts.id, context.req.param("id")))
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
      .where(eq(podcasts.id, podcast.id));

    startPodcastJob({ id: podcast.id, topic: podcast.topic, maxIterations: 5 });
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
    const id = context.req.param("id");
    const [podcast] = await db
      .select()
      .from(podcasts)
      .where(eq(podcasts.id, id))
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
      });
      await db
        .update(podcasts)
        .set({ article: JSON.stringify(article), updatedAt: new Date() })
        .where(eq(podcasts.id, id));
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
      ...toPodcastSummary(podcast),
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
