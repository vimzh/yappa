"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiFetch } from "@/lib/api";


type PodcastCost = {
  metered: boolean;
  partial: boolean;
  totalUsd: number;
  openai: {
    costUsd: number;
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    webSearchCalls: number;
    calls: number;
  };
  fish: {
    costUsd: number;
    inputBytes: number;
    requests: number;
  };
};

type CostResponse = {
  totals: {
    totalUsd: number;
    openaiUsd: number;
    fishUsd: number;
    meteredPodcasts: number;
    partialPodcasts: number;
  };
  podcasts: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
    cost: PodcastCost;
  }>;
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const number = new Intl.NumberFormat("en-US");

function MeteredCost({ cost }: { cost: PodcastCost }) {
  if (!cost.metered) return <span className="text-muted-foreground">Not metered</span>;
  return (
    <span className="font-mono tabular-nums">
      {money.format(cost.totalUsd)}{cost.partial ? "*" : ""}
    </span>
  );
}

export function CostsDashboard() {
  const [data, setData] = useState<CostResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCosts() {
      try {
        const response = await apiFetch("/costs");
        if (!response.ok) throw new Error(`API returned ${response.status}.`);
        if (mounted) {
          setData((await response.json()) as CostResponse);
          setError(null);
        }
      } catch {
        if (mounted) setError("Couldn’t load cost data. Check that the API is running.");
      }
    }

    void loadCosts();
    const interval = window.setInterval(loadCosts, 5_000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <section aria-labelledby="costs-heading" className="mx-auto w-full max-w-6xl">
      <div className="max-w-2xl">
        <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground">Cost ledger</p>
        <h1 className="mt-3 text-balance font-mono text-3xl tracking-[-0.04em] sm:text-4xl" id="costs-heading">
          What each podcast costs to make.
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Actual OpenAI token and web-search usage, plus Fish Audio TTS input bytes.
        </p>
      </div>

      {error ? <p className="mt-8 text-sm text-destructive" role="alert">{error}</p> : null}

      {!data ? (
        <p aria-live="polite" className="mt-12 text-muted-foreground">Loading costs…</p>
      ) : (
        <>
          <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_repeat(2,minmax(0,1fr))]">
            <Card className="bg-muted/45">
              <CardHeader>
                <CardDescription>Metered generation cost</CardDescription>
                <CardTitle className="font-mono text-4xl tracking-[-0.05em] tabular-nums">
                  {money.format(data.totals.totalUsd)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Across {data.totals.meteredPodcasts} podcast{data.totals.meteredPodcasts === 1 ? "" : "s"} created after metering started.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>OpenAI</CardDescription>
                <CardTitle className="font-mono text-2xl tabular-nums">{money.format(data.totals.openaiUsd)}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Tokens and web-search calls.</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Fish Audio</CardDescription>
                <CardTitle className="font-mono text-2xl tabular-nums">{money.format(data.totals.fishUsd)}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">TTS input bytes at the active model rate.</CardContent>
            </Card>
          </div>

          <div className="mt-10 overflow-x-auto border-y [scrollbar-gutter:stable]">
            <table className="min-w-[50rem] w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="py-3 pr-6 font-medium">Podcast</th>
                  <th className="px-4 py-3 text-right font-medium">OpenAI</th>
                  <th className="px-4 py-3 text-right font-medium">Fish Audio</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="py-3 pl-4 text-right font-medium">Usage</th>
                </tr>
              </thead>
              <tbody>
                {data.podcasts.map((podcast) => (
                  <tr className="border-b last:border-0 hover:bg-muted/40" key={podcast.id}>
                    <td className="max-w-md py-4 pr-6">
                      <Link className="font-medium underline decoration-transparent underline-offset-4 transition-colors hover:decoration-foreground" href={`/podcasts/${podcast.id}`}>
                        {podcast.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(podcast.createdAt).toLocaleDateString("en", { dateStyle: "medium" })} · {podcast.status}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right font-mono tabular-nums">
                      {podcast.cost.metered ? money.format(podcast.cost.openai.costUsd) : "—"}
                    </td>
                    <td className="px-4 py-4 text-right font-mono tabular-nums">
                      {podcast.cost.metered ? money.format(podcast.cost.fish.costUsd) : "—"}
                    </td>
                    <td className="px-4 py-4 text-right"><MeteredCost cost={podcast.cost} /></td>
                    <td className="py-4 pl-4 text-right text-xs text-muted-foreground">
                      {podcast.cost.metered
                        ? `${number.format(podcast.cost.openai.inputTokens + podcast.cost.openai.outputTokens)} tokens · ${podcast.cost.openai.webSearchCalls} searches · ${number.format(podcast.cost.fish.inputBytes)} bytes`
                        : "Created before metering"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Costs marked with * have unpriced provider usage. Existing episodes were created before usage metering and remain unavailable rather than estimated.
          </p>
        </>
      )}
    </section>
  );
}
