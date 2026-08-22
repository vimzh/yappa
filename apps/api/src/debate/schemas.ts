import { z } from "zod";

export const podcastStatuses = [
  "scheduled",
  "queued",
  "researching",
  "verifying",
  "writing",
  "synthesizing",
  "ready",
  "failed",
] as const;

export type PodcastStatus = (typeof podcastStatuses)[number];

export const sourceSchema = z.object({
  title: z.string(),
  url: z.string(),
  publisher: z.string(),
});

const researchClaimSchema = z.object({
  id: z.string(),
  claim: z.string(),
  evidence: z.string(),
  sources: z.array(sourceSchema).min(1).max(3),
});

export const researchBriefSchema = z.object({
  side: z.enum(["A", "B"]),
  position: z.string(),
  opening: z.string(),
  claims: z.array(researchClaimSchema).min(4).max(6),
  concessions: z.array(z.string()).min(1).max(3),
  questionsForOpponent: z.array(z.string()).min(2).max(4),
});

export type ResearchBrief = z.infer<typeof researchBriefSchema>;

const verifiedClaimSchema = z.object({
  id: z.string(),
  claim: z.string(),
  evidence: z.string(),
  correction: z.string().nullable(),
  confidence: z.number().int().min(0).max(100),
  sources: z.array(sourceSchema).min(1).max(3),
});

export const verificationBriefSchema = z.object({
  side: z.enum(["A", "B"]),
  approved: z.boolean(),
  score: z.number().int().min(0).max(100),
  verifiedClaims: z.array(verifiedClaimSchema).min(3).max(6),
  rejectedClaims: z
    .array(z.object({ id: z.string(), reason: z.string() }))
    .max(6),
  notes: z.array(z.string()).max(6),
});

export type VerificationBrief = z.infer<typeof verificationBriefSchema>;

export const transcriptTurnSchema = z.object({
  speaker: z.enum(["A", "B"]),
  delivery: z.enum([
    "calm",
    "confident",
    "curious",
    "doubtful",
    "empathetic",
    "relaxed",
  ]),
  text: z.string(),
  pauseAfter: z.enum(["none", "short", "long"]),
  claimIds: z.array(z.string()).max(4),
});

export const transcriptSchema = z.object({
  title: z.string(),
  summary: z.string(),
  turns: z.array(transcriptTurnSchema).min(24).max(72),
  conclusion: z.string(),
});

export type DebateTranscript = z.infer<typeof transcriptSchema>;

export const transcriptReviewSchema = z.object({
  humanRhythm: z.number().int().min(0).max(100),
  argumentativeResponsiveness: z.number().int().min(0).max(100),
  factualAccuracy: z.number().int().min(0).max(100),
  listeningClarity: z.number().int().min(0).max(100),
  ttsReadiness: z.number().int().min(0).max(100),
  sourceDiscipline: z.number().int().min(0).max(100),
  overall: z.number().int().min(0).max(100),
  approved: z.boolean(),
  strengths: z.array(z.string()).min(1).max(5),
  issues: z.array(z.string()).max(5),
  nextRevisionInstructions: z.array(z.string()).max(5),
});

export type TranscriptReview = z.infer<typeof transcriptReviewSchema>;

export type TranscriptIteration = {
  iteration: number;
  transcript: DebateTranscript;
  review: TranscriptReview;
  wordCount: number;
};

export type PodcastReport = {
  approved: boolean;
  transcriptIterations: number;
  selectedIteration: number;
  fullTranscriptWords: number;
  audioPreviewWords: number;
  scores: TranscriptReview & {
    sourceVerification: number;
    finalOverall: number;
  };
  iterationScores: Array<{
    iteration: number;
    overall: number;
    humanRhythm: number;
    factualAccuracy: number;
    ttsReadiness: number;
  }>;
};
