import { expect, test } from "bun:test";

import {
  isVoiceAId,
  isVoiceBId,
  resolveVoiceIds,
  voiceAOptions,
  voiceBOptions,
} from "./voice-catalog";

test("keeps five distinct choices for each debate speaker", () => {
  expect(voiceAOptions).toHaveLength(5);
  expect(voiceBOptions).toHaveLength(5);
  expect(new Set([...voiceAOptions, ...voiceBOptions].map((voice) => voice.id)).size).toBe(10);

  const selected: [string, string] = [voiceAOptions[2].id, voiceBOptions[3].id];
  expect(isVoiceAId(selected[0])).toBe(true);
  expect(isVoiceBId(selected[1])).toBe(true);
  expect(resolveVoiceIds({ voiceAId: selected[0], voiceBId: selected[1] })).toEqual(selected);
});
