import { expect, test } from "bun:test";

import { calculateOpenAICost } from "./costs";

test("prices OpenAI tokens and web search calls in nano USD", () => {
  expect(
    calculateOpenAICost({
      model: "gpt-5.6-terra",
      inputTokens: 100,
      cachedInputTokens: 20,
      outputTokens: 50,
      reasoningTokens: 0,
      webSearchCalls: 2,
    }),
  ).toBe(20_764_000);
});

test("marks unrecognized model pricing as unavailable", () => {
  expect(
    calculateOpenAICost({
      model: "unknown-model",
      inputTokens: 1,
      cachedInputTokens: 0,
      outputTokens: 1,
      reasoningTokens: 0,
      webSearchCalls: 0,
    }),
  ).toBeNull();
});
