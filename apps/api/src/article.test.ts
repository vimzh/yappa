import { describe, expect, test } from "bun:test";

import { finalizeArticle } from "./article";

describe("learning article delivery", () => {
  test("checks references and derives stable reading metadata", () => {
    const paragraph = Array.from({ length: 100 }, (_, index) => `word${index}`).join(
      " ",
    );
    const draft = {
      title: "A balanced guide",
      dek: "A short introduction to the debate.",
      sections: Array.from({ length: 5 }, (_, index) => ({
        heading: `Section ${index + 1}`,
        paragraphs: [
          { text: paragraph, sourceIndexes: [index + 1] },
          { text: paragraph, sourceIndexes: [index + 1] },
        ],
      })),
    };
    const generatedAt = new Date("2026-08-20T10:00:00.000Z");

    const article = finalizeArticle(draft, 5, generatedAt);

    expect(article.wordCount).toBe(1_006);
    expect(article.readingMinutes).toBe(5);
    expect(article.generatedAt).toBe(generatedAt.toISOString());
    expect(() =>
      finalizeArticle(
        {
          ...draft,
          sections: [
            ...draft.sections.slice(0, 4),
            {
              ...draft.sections[4],
              paragraphs: [
                { text: paragraph, sourceIndexes: [6] },
                { text: paragraph, sourceIndexes: [5] },
              ],
            },
          ],
        },
        5,
      ),
    ).toThrow("unknown source 6");
  });
});
