import { db, podcasts } from "@yappa/db";
import { eq, sql } from "drizzle-orm";

import type { OpenAIUsage } from "./debate/openai";

type OpenAIModelRate = {
  input: number;
  cachedInput: number;
  output: number;
};

const openAIRates: Record<string, OpenAIModelRate> = {
  "gpt-5.6-terra": { input: 2, cachedInput: 0.2, output: 12 },
  "gpt-5.6-luna": { input: 0.2, cachedInput: 0.02, output: 1.2 },
};

const fishRatesPerMillionBytes: Record<string, number> = {
  "s2.1-pro-free": 0,
  "s2.1-pro": 15,
  "s2-pro": 15,
  s1: 10,
};

const webSearchNanoUsdPerCall = 10_000_000;

function toNanoUsd(units: number, usdPerMillionUnits: number) {
  return Math.round(units * usdPerMillionUnits * 1_000);
}

function fishRate(model: string) {
  const override = process.env.FISH_TTS_COST_PER_MILLION_UTF8_BYTES;
  if (override) {
    const parsed = Number(override);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return fishRatesPerMillionBytes[model];
}

export function calculateOpenAICost(usage: OpenAIUsage) {
  const rate = openAIRates[usage.model];
  if (!rate) return null;

  const uncachedInputTokens = Math.max(
    usage.inputTokens - usage.cachedInputTokens,
    0,
  );
  return (
    toNanoUsd(uncachedInputTokens, rate.input) +
    toNanoUsd(usage.cachedInputTokens, rate.cachedInput) +
    toNanoUsd(usage.outputTokens, rate.output) +
    usage.webSearchCalls * webSearchNanoUsdPerCall
  );
}

export async function recordOpenAIUsage(id: string, usage: OpenAIUsage) {
  const costNanoUsd = calculateOpenAICost(usage);

  await db
    .update(podcasts)
    .set({
      openaiInputTokens: sql`${podcasts.openaiInputTokens} + ${usage.inputTokens}`,
      openaiCachedInputTokens: sql`${podcasts.openaiCachedInputTokens} + ${usage.cachedInputTokens}`,
      openaiOutputTokens: sql`${podcasts.openaiOutputTokens} + ${usage.outputTokens}`,
      openaiReasoningTokens: sql`${podcasts.openaiReasoningTokens} + ${usage.reasoningTokens}`,
      openaiWebSearchCalls: sql`${podcasts.openaiWebSearchCalls} + ${usage.webSearchCalls}`,
      openaiMeteredCalls: sql`${podcasts.openaiMeteredCalls} + 1`,
      openaiUnpricedCalls: sql`${podcasts.openaiUnpricedCalls} + ${costNanoUsd === null ? 1 : 0}`,
      openaiCostNanoUsd: sql`${podcasts.openaiCostNanoUsd} + ${costNanoUsd ?? 0}`,
      updatedAt: new Date(),
    })
    .where(eq(podcasts.id, id));
}

export async function recordFishUsage(id: string, text: string, model: string) {
  const inputBytes = Buffer.byteLength(text, "utf8");
  const rate = fishRate(model);
  const costNanoUsd = rate === undefined ? null : toNanoUsd(inputBytes, rate);

  await db
    .update(podcasts)
    .set({
      fishInputBytes: sql`${podcasts.fishInputBytes} + ${inputBytes}`,
      fishTtsRequests: sql`${podcasts.fishTtsRequests} + 1`,
      fishUnpricedRequests: sql`${podcasts.fishUnpricedRequests} + ${costNanoUsd === null ? 1 : 0}`,
      fishCostNanoUsd: sql`${podcasts.fishCostNanoUsd} + ${costNanoUsd ?? 0}`,
      updatedAt: new Date(),
    })
    .where(eq(podcasts.id, id));
}

function toUsd(nanoUsd: number) {
  return nanoUsd / 1_000_000_000;
}

export function toPodcastCost(podcast: typeof podcasts.$inferSelect) {
  const hasUsage =
    podcast.openaiMeteredCalls > 0 || podcast.fishTtsRequests > 0;
  const hasUnpricedUsage =
    podcast.openaiUnpricedCalls > 0 || podcast.fishUnpricedRequests > 0;
  const openaiUsd = toUsd(podcast.openaiCostNanoUsd);
  const fishUsd = toUsd(podcast.fishCostNanoUsd);

  return {
    metered: hasUsage,
    partial: hasUnpricedUsage,
    totalUsd: openaiUsd + fishUsd,
    openai: {
      costUsd: openaiUsd,
      inputTokens: podcast.openaiInputTokens,
      cachedInputTokens: podcast.openaiCachedInputTokens,
      outputTokens: podcast.openaiOutputTokens,
      reasoningTokens: podcast.openaiReasoningTokens,
      webSearchCalls: podcast.openaiWebSearchCalls,
      calls: podcast.openaiMeteredCalls,
    },
    fish: {
      costUsd: fishUsd,
      inputBytes: podcast.fishInputBytes,
      requests: podcast.fishTtsRequests,
    },
  };
}

export function summarizeCosts(rows: Array<typeof podcasts.$inferSelect>) {
  const costs = rows.map(toPodcastCost);
  return {
    totalUsd: costs.reduce((total, cost) => total + cost.totalUsd, 0),
    openaiUsd: costs.reduce((total, cost) => total + cost.openai.costUsd, 0),
    fishUsd: costs.reduce((total, cost) => total + cost.fish.costUsd, 0),
    meteredPodcasts: costs.filter((cost) => cost.metered).length,
    partialPodcasts: costs.filter((cost) => cost.partial).length,
  };
}
