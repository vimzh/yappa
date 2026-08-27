import { expect, test } from "bun:test";

import { toGenerationQuota } from "./generation-quota";

test("caps the free podcast allowance at three generations", () => {
  expect(toGenerationQuota(2)).toEqual({
    limit: 3,
    used: 2,
    remaining: 1,
    allowedDurations: [1, 3, 5],
  });
  expect(toGenerationQuota(4).remaining).toBe(0);
});
