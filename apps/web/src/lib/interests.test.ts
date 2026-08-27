import { expect, test } from "bun:test";

import { parseInterestTopics } from "./interests";

test("parses and deduplicates comma-separated interests", () => {
  expect(parseInterestTopics(" cars, bikes, Cars, urban design ")).toEqual([
    "cars",
    "bikes",
    "urban design",
  ]);
});
