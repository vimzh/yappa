import { z } from "zod";

import { runStructured } from "./debate/openai";
import type { DebateTranscript } from "./debate/schemas";

const articleParagraphSchema = z.object({
  text: z.string(),
  sourceIndexes: z.array(z.number().int()).max(6),
});

const articleDraftSchema = z.object({
  title: z.string(),
  dek: z.string(),
  sections: z
    .array(
      z.object({
        heading: z.string(),
        paragraphs: z.array(articleParagraphSchema).min(2).max(4),
      }),
    )
    .min(5)
    .max(7),
});

type ArticleDraft = z.infer<typeof articleDraftSchema>;

export type LearningArticle = ArticleDraft & {
  generatedAt: string;
  wordCount: number;
  readingMinutes: number;
};

export type ArticleSource = {
  title: string;
  url: string;
  publisher: string;
};

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function finalizeArticle(
  draft: ArticleDraft,
  sourceCount: number,
  generatedAt = new Date(),
): LearningArticle {
  const paragraphs = draft.sections.flatMap((section) => section.paragraphs);
  const sourceIndexes = paragraphs.flatMap((paragraph) => paragraph.sourceIndexes);
  const invalidSource = sourceIndexes.find(
    (index) => index < 1 || index > sourceCount,
  );
  if (invalidSource !== undefined) {
    throw new Error(`Article cited unknown source ${invalidSource}.`);
  }

  if (new Set(sourceIndexes).size < 4) {
    throw new Error("Article used fewer than 4 verified sources.");
  }

  const wordCount =
    countWords(draft.dek) +
    paragraphs.reduce((total, paragraph) => total + countWords(paragraph.text), 0);
  if (wordCount < 900 || wordCount > 2_200) {
    throw new Error(`Article length was ${wordCount} words; expected 900-2,200.`);
  }

  return {
    ...draft,
    generatedAt: generatedAt.toISOString(),
    wordCount,
    readingMinutes: Math.max(1, Math.ceil(wordCount / 220)),
  };
}

export async function generateLearningArticle(options: {
  topic: string;
  transcript: DebateTranscript;
  sources: ArticleSource[];
}) {
  const sourceCatalog = options.sources
    .map(
      (source, index) =>
        `[${index + 1}] ${source.title} — ${source.publisher}\n${source.url}`,
    )
    .join("\n\n");

  const draft = await runStructured({
    schema: articleDraftSchema,
    schemaName: "podcast_learning_article",
    model: process.env.OPENAI_EDITOR_MODEL ?? "gpt-5.6-luna",
    reasoningEffort: "none",
    maxOutputTokens: 3_600,
    instructions: `You are Yappa's evidence-disciplined learning editor. Turn a verified two-sided podcast transcript into a clear, balanced long-form article.

Write 900-1,800 words across 5-7 titled sections, with 2-4 substantial paragraphs per section. Open with the core tension, explain the strongest case on each side, surface the meaningful concessions, and end with what remains unresolved. Preserve uncertainty and disagreement instead of declaring a winner.

Use only facts already present in the transcript and supplied source catalog. Each paragraph's sourceIndexes must list the 1-based catalog entries that support its factual claims. Analytical or transitional paragraphs may use an empty list. Never invent a source, URL, quotation, statistic, or claim. Keep the prose natural and readable; remove podcast filler and stage directions.`,
    input: `Topic: ${options.topic}

Verified transcript:
${JSON.stringify(options.transcript)}

Verified source catalog:
${sourceCatalog}`,
  });

  return finalizeArticle(draft, options.sources.length);
}
