import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { db, podcasts, type Podcast } from "@yappa/db";
import { eq } from "drizzle-orm";

import { recordFishUsage, recordOpenAIUsage } from "../costs";
import { synthesizeDebatePreview } from "./fish-audio";
import { assertRequiredCredentials } from "./openai";
import { researchSide } from "./research-agent";
import {
  type PodcastReport,
  type PodcastStatus,
  type DebateTranscript,
  type ResearchBrief,
  type TranscriptIteration,
  type VerificationBrief,
} from "./schemas";
import { iterateTranscript, toFishAudioText } from "./transcript-agent";
import { verifySide } from "./verification-agent";

const artifactRoot = resolve(import.meta.dir, "../../../../data/podcasts");

export function audioWordLimit(durationMinutes: number) {
  return durationMinutes * 150;
}

async function updatePodcast(
  id: string,
  values: Partial<Omit<Podcast, "id" | "createdAt">>,
) {
  await db
    .update(podcasts)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(podcasts.id, id));
}

async function setStage(
  id: string,
  status: PodcastStatus,
  progress: number,
) {
  await updatePodcast(id, { status, progress });
}

async function writeJson(path: string, value: unknown) {
  await Bun.write(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function readJson<T>(path: string): Promise<T | null> {
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  return JSON.parse(await file.text()) as T;
}

async function loadOrCreateJson<T>(path: string, create: () => Promise<T>) {
  const cached = await readJson<T>(path);
  if (cached) return cached;

  const value = await create();
  await writeJson(path, value);
  return value;
}

function uniqueSources(sideA: VerificationBrief, sideB: VerificationBrief) {
  const byUrl = new Map<string, { title: string; url: string; publisher: string }>();

  for (const brief of [sideA, sideB]) {
    for (const claim of brief.verifiedClaims) {
      for (const source of claim.sources) {
        byUrl.set(source.url, source);
      }
    }
  }

  return [...byUrl.values()];
}

function createReport(
  artifacts: TranscriptIteration[],
  selected: TranscriptIteration,
  sourceVerification: number,
  audioPreviewWords: number,
): PodcastReport {
  const finalOverall = Math.round(
    selected.review.overall * 0.75 + sourceVerification * 0.25,
  );

  return {
    approved:
      selected.review.approved &&
      selected.review.factualAccuracy >= 88 &&
      selected.review.humanRhythm >= 82 &&
      selected.review.ttsReadiness >= 85 &&
      finalOverall >= 85,
    transcriptIterations: artifacts.length,
    selectedIteration: selected.iteration,
    fullTranscriptWords: selected.wordCount,
    audioPreviewWords,
    scores: {
      ...selected.review,
      sourceVerification,
      finalOverall,
    },
    iterationScores: artifacts.map((artifact) => ({
      iteration: artifact.iteration,
      overall: artifact.review.overall,
      humanRhythm: artifact.review.humanRhythm,
      factualAccuracy: artifact.review.factualAccuracy,
      ttsReadiness: artifact.review.ttsReadiness,
    })),
  };
}

export async function runPodcastGeneration(options: {
  id: string;
  topic: string;
  durationMinutes: number;
  maxIterations: number;
}) {
  assertRequiredCredentials();

  const directory = resolve(artifactRoot, options.id);
  await mkdir(directory, { recursive: true });

  await setStage(options.id, "researching", 12);
  const sideAResearchPath = resolve(directory, "side-a-research.json");
  const sideBResearchPath = resolve(directory, "side-b-research.json");
  const [sideAResearch, sideBResearch] = await Promise.all([
    loadOrCreateJson<ResearchBrief>(sideAResearchPath, () =>
      researchSide(options.topic, "A", (usage) =>
        recordOpenAIUsage(options.id, usage),
      ),
    ),
    loadOrCreateJson<ResearchBrief>(sideBResearchPath, () =>
      researchSide(options.topic, "B", (usage) =>
        recordOpenAIUsage(options.id, usage),
      ),
    ),
  ]);

  await setStage(options.id, "verifying", 38);
  const sideAVerificationPath = resolve(directory, "side-a-verification.json");
  const sideBVerificationPath = resolve(directory, "side-b-verification.json");
  const [sideA, sideB] = await Promise.all([
    loadOrCreateJson<VerificationBrief>(sideAVerificationPath, () =>
      verifySide(options.topic, sideAResearch, (usage) =>
        recordOpenAIUsage(options.id, usage),
      ),
    ),
    loadOrCreateJson<VerificationBrief>(sideBVerificationPath, () =>
      verifySide(options.topic, sideBResearch, (usage) =>
        recordOpenAIUsage(options.id, usage),
      ),
    ),
  ]);

  if (!sideA.approved || !sideB.approved) {
    throw new Error("A verifier could not approve enough source-backed claims.");
  }

  const cachedTranscript = await readJson<DebateTranscript>(
    resolve(directory, "transcript.json"),
  );
  const cachedReport = await readJson<PodcastReport>(
    resolve(directory, "report.json"),
  );
  if (cachedTranscript && cachedReport?.approved) {
    const preview = toFishAudioText(
      cachedTranscript,
      audioWordLimit(options.durationMinutes),
    );
    const audioPath = resolve(directory, "preview.mp3");
    await setStage(options.id, "synthesizing", 88);
    const fish = await synthesizeDebatePreview(preview.text, audioPath);
    await recordFishUsage(options.id, preview.text, fish.model);
    await updatePodcast(options.id, {
      status: "ready",
      progress: 100,
      audioPath,
      error: null,
    });
    return cachedReport;
  }

  await setStage(options.id, "writing", 56);
  const { artifacts, best } = await iterateTranscript({
    topic: options.topic,
    sideA,
    sideB,
    durationMinutes: options.durationMinutes,
    maxIterations: options.maxIterations,
    onUsage: (usage) => recordOpenAIUsage(options.id, usage),
    onIteration: async (artifact) => {
      await Promise.all([
        writeJson(
          resolve(directory, `transcript-iteration-${artifact.iteration}.json`),
          artifact,
        ),
        updatePodcast(options.id, {
          progress: 56 + Math.round((artifact.iteration / options.maxIterations) * 24),
          transcriptIterations: artifact.iteration,
          qualityScore: artifact.review.overall,
        }),
      ]);
    },
  });

  const preview = toFishAudioText(
    best.transcript,
    audioWordLimit(options.durationMinutes),
  );
  const sourceVerification = Math.round((sideA.score + sideB.score) / 2);
  const report = createReport(
    artifacts,
    best,
    sourceVerification,
    preview.spokenWords,
  );
  const sources = uniqueSources(sideA, sideB);

  await Promise.all([
    writeJson(resolve(directory, "transcript.json"), best.transcript),
    writeJson(resolve(directory, "sources.json"), sources),
    writeJson(resolve(directory, "report.json"), report),
    updatePodcast(options.id, {
      title: best.transcript.title,
      transcript: JSON.stringify(best.transcript),
      sources: JSON.stringify(sources),
      report: JSON.stringify(report),
      transcriptIterations: artifacts.length,
      qualityScore: report.scores.finalOverall,
    }),
  ]);

  if (!report.approved) {
    throw new Error(
      `Transcript quality gate failed with a score of ${report.scores.finalOverall}.`,
    );
  }

  await setStage(options.id, "synthesizing", 88);
  const audioPath = resolve(directory, "preview.mp3");
  const fish = await synthesizeDebatePreview(preview.text, audioPath);
  await recordFishUsage(options.id, preview.text, fish.model);

  await updatePodcast(options.id, {
    status: "ready",
    progress: 100,
    audioPath,
    error: null,
  });

  return report;
}
