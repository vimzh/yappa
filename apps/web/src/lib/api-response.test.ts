import { expect, test } from "bun:test";

import { readApiJson } from "./api-response";

test("replaces a malformed API response with an actionable error", async () => {
  await expect(readApiJson(new Response("Internal Server Error"))).rejects.toThrow(
    "The API returned an invalid response. Please try again.",
  );
});
