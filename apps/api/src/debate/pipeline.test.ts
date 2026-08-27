import { describe, expect, test } from "bun:test";

import { parseByteRange } from "../audio-range";
import { getPodcastSchedule } from "../podcast-schedule";
import { parseFishAudioEvent, splitFishAudioText } from "./fish-audio";
import { audioWordLimit, formatPodcastPreferences } from "./pipeline";
import { transcriptSchema } from "./schemas";
import {
  countTranscriptWords,
  toFishAudioText,
  transcriptWordTarget,
} from "./transcript-agent";

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
    expect(transcriptWordTarget(10)).toBe(1_500);
    expect(transcriptWordTarget(20)).toBe(3_000);
    expect(countTranscriptWords(transcript)).toBe(216);
  });

  test("formats optional listener preferences for generation", () => {
    expect(formatPodcastPreferences("Use examples", "Skip jargon")).toContain(
      "Include: Use examples\nAvoid: Skip jargon",
    );
    expect(formatPodcastPreferences(null, null)).toBe(
      "No additional listener preferences.",
    );
  });

  test("caps the preview and includes both voices", () => {
    const preview = toFishAudioText(transcript, 90);

    expect(preview.spokenWords).toBe(90);
    expect(preview.text).toContain("<|speaker:0|>");
    expect(preview.text).toContain("<|speaker:1|>");
    expect(preview.text).toContain("[break]");
  });

  test("splits long Fish requests only between speaker turns", () => {
    const preview = toFishAudioText(transcript, 216);
    const chunks = splitFishAudioText(preview.text, 40);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("")).toBe(preview.text);
    expect(chunks.every((chunk) => chunk.includes("<|speaker:"))).toBe(true);
  });

  test("decodes Fish Audio streaming events", () => {
    const audio = parseFishAudioEvent(
      JSON.stringify({ audio_base64: Buffer.from("mp3").toString("base64") }),
    );

    expect(audio).toEqual(Buffer.from("mp3"));
    expect(parseFishAudioEvent(JSON.stringify({ alignment: {} }))).toBeNull();
    expect(() =>
      parseFishAudioEvent(JSON.stringify({ status: 500, message: "failed" })),
    ).toThrow("Fish Audio streaming error: failed");
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
