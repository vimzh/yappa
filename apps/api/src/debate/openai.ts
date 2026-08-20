import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";

let client: OpenAI | undefined;

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  client ??= new OpenAI({ apiKey, maxRetries: 1, timeout: 300_000 });
  return client;
}

export function assertRequiredCredentials() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  if (!process.env.FISH_API_KEY) {
    throw new Error("FISH_API_KEY is not configured.");
  }
}

export async function runStructured<TSchema extends z.ZodType>(options: {
  schema: TSchema;
  schemaName: string;
  instructions: string;
  input: string;
  maxOutputTokens: number;
  webSearch?: boolean;
}) {
  const response = await getClient().responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6",
    instructions: options.instructions,
    input: options.input,
    max_output_tokens: options.maxOutputTokens,
    max_tool_calls: options.webSearch ? 10 : undefined,
    reasoning: { effort: "low" },
    store: false,
    tools: options.webSearch
      ? [{ type: "web_search", search_context_size: "high" }]
      : undefined,
    tool_choice: options.webSearch ? "required" : undefined,
    include: options.webSearch
      ? ["web_search_call.action.sources"]
      : undefined,
    text: {
      format: zodTextFormat(options.schema, options.schemaName),
    },
  });

  if (!response.output_parsed) {
    const reason = response.incomplete_details?.reason;
    throw new Error(
      `${options.schemaName} returned no structured output (status: ${response.status}${reason ? `, reason: ${reason}` : ""}).`,
    );
  }

  return response.output_parsed;
}
