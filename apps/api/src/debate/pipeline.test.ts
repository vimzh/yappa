import { describe, expect, test } from "bun:test";

import { parseByteRange } from "../audio-range";
import { getPodcastSchedule } from "../podcast-schedule";
import { audioWordLimit } from "./pipeline";
import { transcriptSchema } from "./schemas";
import { toFishAudioText } from "./transcript-agent";

const transcript = transcriptSchema.parse({
  title: "A test debate",
  summary: "Two sides test a claim.",
  conclusion: "Both sides learned something.",
  turns: Array.from({ length: 24 }, (_, index) => ({
    speaker: index % 2 === 0 ? "A" : "B",
    delivery: index % 2 === 0 ? "confident" : "doubtful",
    text: `Turn ${index + 1} makes one concise evidence based point today.`,
    pauseAfter: index % 3 === 0 ? "short" : "none",
    claimIds: [`${index % 2 === 0 ? "A" : "B"}1`],
  })),
});

describe("podcast delivery helpers", () => {
  test("maps selected minutes to spoken-word audio length", () => {
    expect(audioWordLimit(1)).toBe(150);
    expect(audioWordLimit(3)).toBe(450);
    expect(audioWordLimit(5)).toBe(750);
  });

  test("caps the preview and includes both voices", () => {
    const preview = toFishAudioText(transcript, 90);

    expect(preview.spokenWords).toBeLessThanOrEqual(90);
    expect(preview.text).toContain("<|speaker:0|>");
    expect(preview.text).toContain("<|speaker:1|>");
    expect(preview.text).toContain("[break]");
  });

  test("parses browser byte ranges", () => {
    expect(parseByteRange("bytes=100-199", 1_000)).toEqual({
      start: 100,
      end: 199,
    });
    expect(parseByteRange("bytes=-100", 1_000)).toEqual({
      start: 900,
      end: 999,
    });
    expect(parseByteRange("bytes=2000-", 1_000)).toBe("invalid");
  });

  test("starts immediate podcasts and preserves future scheduling metadata", () => {
    const now = new Date("2026-08-20T10:00:00.000Z");

    expect(
      getPodcastSchedule("2026-08-20T11:00:00.000Z", now),
    ).toMatchObject({ status: "scheduled", progress: 0, shouldStart: false });
    expect(
      getPodcastSchedule("2026-08-20T09:00:00.000Z", now),
    ).toMatchObject({ status: "queued", progress: 4, shouldStart: true });
  });
});
