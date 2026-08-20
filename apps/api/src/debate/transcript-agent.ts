import { runStructured } from "./openai";
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

function conversationGuide(durationMinutes: number) {
  const targetWords = durationMinutes * 150;
  return `Write 24-44 short turns and roughly ${Math.round(targetWords * 0.9)}-${Math.round(targetWords * 1.1)} spoken words. Each turn should be 1-3 sentences. The speakers must answer each other directly, challenge assumptions, concede strong points, and change pace naturally.

Always begin with two brief orientation turns. Maya naturally states today's topic, introduces herself by name, and says which position she is taking. Rowan then introduces himself by name and states the opposite position. Keep these introductions conversational, free of evidence claims, and under two sentences each; begin the actual disagreement immediately afterward.

Human rhythm is sparse, not messy: use an occasional filler, self-correction, unfinished thought, callback, or brief interruption. Do not put a filler in every turn. Avoid symmetrical mini-essays, canned transitions, repeated agreement, fake quotations, and personal attacks. Use only supplied verified claim IDs. Keep source citations out of the spoken words; claimIds carry attribution. Delivery and pause fields become Fish Audio cues later.`;
}

function countTranscriptWords(transcript: DebateTranscript) {
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
) {
  return runStructured({
    schema: transcriptSchema,
    schemaName: "debate_transcript",
    model: process.env.OPENAI_EDITOR_MODEL ?? "gpt-5.6-luna",
    reasoningEffort: "none",
    maxOutputTokens: 3_500,
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
) {
  return runStructured({
    schema: transcriptSchema,
    schemaName: "revised_debate_transcript",
    model: process.env.OPENAI_EDITOR_MODEL ?? "gpt-5.6-luna",
    reasoningEffort: "none",
    maxOutputTokens: 3_500,
    instructions: `You are revising a debate podcast after an exacting editorial review.

${speakerGuide}

${conversationGuide(durationMinutes)}

Fix the review issues without flattening the voices or adding unsupported facts. Keep what already works.`,
    input: `Proposition: ${topic}

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
) {
  return runStructured({
    schema: transcriptReviewSchema,
    schemaName: "transcript_quality_review",
    model: process.env.OPENAI_EDITOR_MODEL ?? "gpt-5.6-luna",
    reasoningEffort: "none",
    maxOutputTokens: 1_200,
    instructions: `You are a strict podcast editor and factual quality reviewer. Score the supplied transcript from 0-100 on each metric.

Penalize a missing or bloated topic-and-speaker orientation, alternating speeches that do not respond to each other, excessive fillers, repeated cadences, unsupported factual claims, citation IDs that do not exist, and stage directions that would be spoken aloud. Reward a concise opening that identifies the topic, Maya's side, and Rowan's side, followed by concessions, follow-up questions, callbacks, clean listening structure, distinct voices, and sparse Fish Audio-ready delivery cues. approved requires overall >= 85, factualAccuracy >= 88, humanRhythm >= 82, and ttsReadiness >= 85.`,
    input: `Proposition: ${topic}

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
  onIteration?: (artifact: TranscriptIteration) => Promise<void>;
}) {
  const artifacts: TranscriptIteration[] = [];
  let transcript = await createTranscript(
    options.topic,
    options.sideA,
    options.sideB,
    options.durationMinutes,
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
      );
    }

    review = await reviewTranscript(
      options.topic,
      options.sideA,
      options.sideB,
      transcript,
    );

    const artifact = {
      iteration,
      transcript,
      review,
      wordCount: countTranscriptWords(transcript),
    };
    artifacts.push(artifact);
    await options.onIteration?.(artifact);

    if (review.approved) {
      break;
    }
  }

  const best = artifacts.reduce((current, candidate) =>
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
    if (spokenWords > 0 && spokenWords + words.length > maxSpokenWords) {
      break;
    }

    const speaker = turn.speaker === "A" ? 0 : 1;
    const pause =
      turn.pauseAfter === "short"
        ? " [break]"
        : turn.pauseAfter === "long"
          ? " [long-break]"
          : "";

    chunks.push(
      `<|speaker:${speaker}|>[${turn.delivery}] ${turn.text.trim()}${pause}`,
    );
    spokenWords += words.length;
  }

  if (!chunks.some((chunk) => chunk.startsWith("<|speaker:0|>"))) {
    throw new Error("Audio preview is missing speaker A.");
  }

  if (!chunks.some((chunk) => chunk.startsWith("<|speaker:1|>"))) {
    throw new Error("Audio preview is missing speaker B.");
  }

  return { text: chunks.join(""), spokenWords };
}
