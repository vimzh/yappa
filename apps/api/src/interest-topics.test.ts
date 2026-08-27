import { expect, test } from "bun:test";

import { podcastTopicSuggestionsSchema } from "./interest-topics";

const topic = {
  title: "Can congestion pricing make cities fairer without limiting mobility?",
  learningAngle:
    "Understand road demand, pricing incentives, public transit funding, and who gains or loses when driving carries a direct cost.",
};

test("requires exactly five substantial podcast topic suggestions", () => {
  expect(podcastTopicSuggestionsSchema.safeParse({ topics: Array(5).fill(topic) }).success).toBe(true);
  expect(podcastTopicSuggestionsSchema.safeParse({ topics: Array(4).fill(topic) }).success).toBe(false);
});
