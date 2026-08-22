import { runStructured, type OpenAIUsage } from "./openai";
import {
  transcriptReviewSchema,
  transcriptSchema,
  type DebateTranscript,
  type TranscriptIteration,
  type TranscriptReview,
  type VerificationBrief,
} from "./schemas";

const speakerGuide = `Speaker A is Maya: a practical optimist with warm energy. She uses concrete examples and will say “look” or “I mean” occasionally.
Speaker B is Rowan: a careful skeptic with dry humor. He asks precise follow-ups and will say “hang on” or “here’s the thing” occasionally.`;

const wordsPerMinute = 150;

export function transcriptWordTarget(durationMinutes: number) {
  return durationMinutes * wordsPerMinute;
}

function transcriptGenerationMinimum(durationMinutes: number) {
  const targetWords = transcriptWordTarget(durationMinutes);
  return targetWords + Math.max(100, Math.round(targetWords * 0.15));
}

function conversationGuide(durationMinutes: number) {
  const targetWords = transcriptWordTarget(durationMinutes);
  const generationMinimum = transcriptGenerationMinimum(durationMinutes);
  const maxTurns = durationMinutes >= 20 ? 72 : durationMinutes >= 10 ? 56 : 44;
  return `Write 24-${maxTurns} short turns and at least ${generationMinimum} spoken words, aiming for ${generationMinimum}-${Math.round(generationMinimum * 1.08)}. The requested audio minimum is ${targetWords} words, so this generation buffer is mandatory; do not end the debate early. Use as many turns as needed while staying under ${maxTurns}. Each turn should be 1-3 sentences. The speakers must answer each other directly, challenge assumptions, concede strong points, and change pace naturally.

Always begin with two brief orientation turns. Maya naturally states today's topic, introduces herself by name, and says which position she is taking. Rowan then introduces himself by name and states the opposite position. Keep these introductions conversational, free of evidence claims, and under two sentences each; begin the actual disagreement immediately afterward.

Human rhythm is sparse, not messy: use an occasional filler, self-correction, unfinished thought, callback, or brief interruption. Do not put a filler in every turn. Avoid symmetrical mini-essays, canned transitions, repeated agreement, fake quotations, and personal attacks. Use only supplied verified claim IDs. Keep source citations out of the spoken words; claimIds carry attribution. Delivery and pause fields become Fish Audio cues later.`;
}

export function countTranscriptWords(transcript: DebateTranscript) {
  return transcript.turns.reduce(
    (total, turn) => total + turn.text.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
}

async function createTranscript(
  topic: string,
  sideA: VerificationBrief,
  sideB: VerificationBrief,
  durationMinutes: number,
  onUsage?: (usage: OpenAIUsage) => Promise<void> | void,
) {
  return runStructured({
    schema: transcriptSchema,
    schemaName: "debate_transcript",
    model: process.env.OPENAI_EDITOR_MODEL ?? "gpt-5.6-luna",
    reasoningEffort: "none",
    maxOutputTokens: Math.max(4_000, durationMinutes * 700),
    onUsage,
    instructions: `You are the senior editor of a two-person educational debate podcast.

    ${speakerGuide}

${conversationGuide(durationMinutes)}`,
    input: `Proposition: ${topic}

Verified side A brief:
${JSON.stringify(sideA)}

Verified side B brief:
${JSON.stringify(sideB)}

After the two orientation turns, enter an interesting disagreement immediately. End with each speaker naming the strongest point they heard from the other side.`,
  });
}

async function reviseTranscript(
  topic: string,
  sideA: VerificationBrief,
  sideB: VerificationBrief,
  transcript: DebateTranscript,
  review: TranscriptReview,
  durationMinutes: number,
  onUsage?: (usage: OpenAIUsage) => Promise<void> | void,
) {
  return runStructured({
    schema: transcriptSchema,
    schemaName: "revised_debate_transcript",
    model: process.env.OPENAI_EDITOR_MODEL ?? "gpt-5.6-luna",
    reasoningEffort: "none",
    maxOutputTokens: Math.max(4_000, durationMinutes * 700),
    onUsage,
    instructions: `You are revising a debate podcast after an exacting editorial review.

${speakerGuide}

${conversationGuide(durationMinutes)}

Fix the review issues without flattening the voices or adding unsupported facts. Keep what already works.`,
    input: `Proposition: ${topic}

Current transcript word count: ${countTranscriptWords(transcript)}. Required generation minimum: ${transcriptGenerationMinimum(durationMinutes)} spoken words. The requested audio minimum is ${transcriptWordTarget(durationMinutes)} words. If the current transcript is below the generation minimum, expand it with additional responsive exchanges and deeper explanation using only the supplied verified claims. Do not summarize or end until the generation minimum is reached.

Verified side A brief:
${JSON.stringify(sideA)}

Verified side B brief:
${JSON.stringify(sideB)}

Current transcript:
${JSON.stringify(transcript)}

Editorial review:
${JSON.stringify(review)}`,
  });
}

async function reviewTranscript(
  topic: string,
  sideA: VerificationBrief,
  sideB: VerificationBrief,
  transcript: DebateTranscript,
  durationMinutes: number,
  onUsage?: (usage: OpenAIUsage) => Promise<void> | void,
) {
  return runStructured({
    schema: transcriptReviewSchema,
    schemaName: "transcript_quality_review",
    model: process.env.OPENAI_EDITOR_MODEL ?? "gpt-5.6-luna",
    reasoningEffort: "none",
    maxOutputTokens: 1_200,
    onUsage,
    instructions: `You are a strict podcast editor and factual quality reviewer. Score the supplied transcript from 0-100 on each metric. It must contain at least ${transcriptWordTarget(durationMinutes)} spoken words for the requested ${durationMinutes}-minute episode. A shorter transcript is not approved, even if its arguments are strong.

Penalize a missing or bloated topic-and-speaker orientation, alternating speeches that do not respond to each other, excessive fillers, repeated cadences, unsupported factual claims, citation IDs that do not exist, and stage directions that would be spoken aloud. Reward a concise opening that identifies the topic, Maya's side, and Rowan's side, followed by concessions, follow-up questions, callbacks, clean listening structure, distinct voices, and sparse Fish Audio-ready delivery cues. approved requires overall >= 85, factualAccuracy >= 88, humanRhythm >= 82, and ttsReadiness >= 85.`,
    input: `Proposition: ${topic}

Deterministic spoken-word count from the application: ${countTranscriptWords(transcript)}. Required minimum: ${transcriptWordTarget(durationMinutes)}. Treat this count as authoritative; do not estimate the length by eye from the JSON.

Verified side A brief:
${JSON.stringify(sideA)}

Verified side B brief:
${JSON.stringify(sideB)}

Transcript to review:
${JSON.stringify(transcript)}`,
  });
}

export async function iterateTranscript(options: {
  topic: string;
  sideA: VerificationBrief;
  sideB: VerificationBrief;
  durationMinutes: number;
  maxIterations: number;
  onUsage?: (usage: OpenAIUsage) => Promise<void> | void;
  onIteration?: (artifact: TranscriptIteration) => Promise<void>;
}) {
  const artifacts: TranscriptIteration[] = [];
  const targetWords = transcriptWordTarget(options.durationMinutes);
  let transcript = await createTranscript(
    options.topic,
    options.sideA,
    options.sideB,
    options.durationMinutes,
    options.onUsage,
  );
  let review: TranscriptReview | undefined;

  for (let iteration = 1; iteration <= options.maxIterations; iteration += 1) {
    if (iteration > 1 && review) {
      transcript = await reviseTranscript(
        options.topic,
        options.sideA,
        options.sideB,
        transcript,
        review,
        options.durationMinutes,
        options.onUsage,
      );
    }

    review = await reviewTranscript(
      options.topic,
      options.sideA,
      options.sideB,
      transcript,
      options.durationMinutes,
      options.onUsage,
    );

    const artifact = {
      iteration,
      transcript,
      review,
      wordCount: countTranscriptWords(transcript),
    };
    artifacts.push(artifact);
    await options.onIteration?.(artifact);

    if (review.approved && artifact.wordCount >= targetWords) {
      break;
    }
  }

  const budgetedArtifacts = artifacts.filter(
    (artifact) => artifact.wordCount >= targetWords,
  );
  const best = (budgetedArtifacts.length > 0 ? budgetedArtifacts : artifacts).reduce((current, candidate) =>
    candidate.review.overall > current.review.overall ? candidate : current,
  );

  return { best, artifacts };
}

export function toFishAudioText(
  transcript: DebateTranscript,
  maxSpokenWords = 90,
) {
  const chunks: string[] = [];
  let spokenWords = 0;

  for (const turn of transcript.turns) {
    const words = turn.text.trim().split(/\s+/).filter(Boolean);
    const remainingWords = maxSpokenWords - spokenWords;
    if (remainingWords <= 0) break;
    const selectedWords = words.slice(0, remainingWords);
    if (selectedWords.length === 0) break;
    const isPartialTurn = selectedWords.length < words.length;

    const speaker = turn.speaker === "A" ? 0 : 1;
    const pause =
      isPartialTurn
        ? ""
        : turn.pauseAfter === "short"
        ? " [break]"
        : turn.pauseAfter === "long"
          ? " [long-break]"
          : "";

    chunks.push(
      `<|speaker:${speaker}|>[${turn.delivery}] ${selectedWords.join(" ")}${pause}`,
    );
    spokenWords += selectedWords.length;
    if (isPartialTurn) break;
  }

  if (!chunks.some((chunk) => chunk.startsWith("<|speaker:0|>"))) {
    throw new Error("Audio preview is missing speaker A.");
  }

  if (!chunks.some((chunk) => chunk.startsWith("<|speaker:1|>"))) {
    throw new Error("Audio preview is missing speaker B.");
  }

  return { text: chunks.join(""), spokenWords };
}
