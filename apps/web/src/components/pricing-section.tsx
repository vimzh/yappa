// Shared pricing cards for the landing section and pricing page.
import { Check } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free",
    price: "$0",
    cadence: "for now",
    description: "Explore a topic, hear both sides, and keep the episode.",
    features: [
      "Debate podcasts from your topics",
      "Sources and argument attribution",
      "MP3 playback and downloads",
    ],
    href: "/home",
    cta: "Try Yappa.ai",
  },
  {
    name: "Plus",
    price: "$30",
    cadence: "/ month",
    description: "For people who want a deeper listening habit every week.",
    features: [
      "More debate generations",
      "Longer custom episodes",
      "A saved listening library",
    ],
    href: null,
    cta: "Get Plus",
  },
  {
    name: "Family",
    price: "$50",
    cadence: "/ month",
    description: "For serious learners who want more room to explore complex ideas.",
    features: [
      "Unlimited debate generations",
      "Long-form custom episodes",
      "Priority access to new features",
    ],
    href: null,
    cta: "Get Family",
  },
] as const;

export function PricingCards() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {plans.map((plan, index) => (
        <article
          className={`flex min-h-96 flex-col rounded-xl border p-6 sm:p-8 ${
            plan.name === "Plus"
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background"
          }`}
          key={plan.name}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-medium">{plan.name}</h3>
              <p
                className={`mt-3 max-w-sm text-pretty leading-relaxed ${
                  plan.name === "Plus" ? "text-background/70" : "text-muted-foreground"
                }`}
              >
                {plan.description}
              </p>
            </div>
            {index === 0 ? (
              <span className="shrink-0 rounded-full bg-foreground px-3 py-1 font-mono text-xs text-background">
                Available
              </span>
            ) : null}
          </div>

          <div className="mt-10 flex items-baseline gap-2">
            <span className="font-mono text-4xl tracking-[-0.04em]">{plan.price}</span>
            {plan.cadence ? <span className="text-sm text-muted-foreground">{plan.cadence}</span> : null}
          </div>

          <ul
            className={`mt-8 space-y-4 border-t pt-6 text-sm ${
              plan.name === "Plus" ? "border-background/20" : "border-border"
            }`}
          >
            {plan.features.map((feature) => (
              <li className="flex items-start gap-3" key={feature}>
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-10">
            {plan.href ? (
              <Button
                className="min-h-11 w-full"
                nativeButton={false}
                render={<Link href={plan.href} />}
                size="lg"
              >
                {plan.cta}
              </Button>
            ) : (
              <span
                className={`flex min-h-11 items-center justify-center rounded-lg border text-sm ${
                  plan.name === "Plus"
                    ? "border-background bg-background text-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {plan.cta}
              </span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
