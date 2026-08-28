import { expect, test } from "bun:test";

import { toGenerationQuota } from "./generation-quota";

test("caps the free podcast allowance at three generations", () => {
  expect(toGenerationQuota(2)).toEqual({
    unlimited: false,
    limit: 3,
    used: 2,
    remaining: 1,
    allowedDurations: [1, 3, 5],
  });
  expect(toGenerationQuota(4).remaining).toBe(0);
});

test("returns an unlimited allowance without capping usage", () => {
  expect(toGenerationQuota(12, true)).toEqual({
    unlimited: true,
    limit: null,
    used: 12,
    remaining: null,
    allowedDurations: [1, 3, 5],
  });
});
