import { AuthDialog } from "@/components/auth-dialog";
import { DemoStack } from "@/components/demo-stack";
import { FooterBar } from "@/components/footer-bar";
import FloatingLines from "@/components/FloatingLines";
import { LandingHeader } from "@/components/landing-header";
import { PricingCards } from "@/components/pricing-section";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const features = [
  {
    title: "The debate, distilled",
    description:
      "Scan the question, the strongest case on each side, and the conclusion in a focused recap that preserves the reasoning without replaying the full episode.",
    image: "/images/features/debate-distilled.png",
    imageAlt: "Two opposing debate paths narrowing into a concise stack of arguments",
  },
  {
    title: "Every cited source",
    description:
      "Follow each claim back to the paper, report, or source that supports it, then open the reference and judge the evidence for yourself.",
    image: "/images/features/source-tracing.png",
    imageAlt: "Research documents connected to a central claim through numbered citations",
  },
  {
    title: "Point-by-point attribution",
    description:
      "See exactly which AI made each point, compare how the arguments develop, and follow either side deeper when one idea catches your attention.",
    image: "/images/features/point-by-point-attribution.png",
    imageAlt: "Two speakers following distinct paths through a sequence of debate points",
  },
];

const useCases = [
  {
    context: "On the road",
    title: "Your commute, timed exactly",
    description:
      "Choose a topic and enter your drive time. Yappa.ai prepares a debate podcast that finishes as you arrive.",
  },
  {
    context: "At the gym",
    title: "A workout for your mind",
    description:
      "Pick what you want to learn and how long you will train. Your podcast runs for the same session.",
  },
  {
    context: "While coding",
    title: "Trade the coding playlist",
    description:
      "Swap repetitive music for a custom debate and learn something new without leaving the keyboard.",
  },
];

const howItWorks = [
  {
    title: "Choose your topic",
    description: "Tell Yappa.ai what interests you and how long you want to listen.",
    image: "/images/how-it-works/01-topic.png",
    imageAlt: "Topic input with interest fields",
  },
  {
    title: "Agents take opposite sides",
    description: "Two AI agents split the question and commit to opposing positions.",
    image: "/images/how-it-works/02-sides.png",
    imageAlt: "Two AI agents taking opposite paths",
  },
  {
    title: "Each side researches",
    description: "Both agents independently gather sources, evidence, and context.",
    image: "/images/how-it-works/03-research.png",
    imageAlt: "Two agents researching independent sources",
  },
  {
    title: "Verifiers check the work",
    description: "One verifier agent reviews each side’s sources, claims, and conclusions.",
    image: "/images/how-it-works/04-verify.png",
    imageAlt: "Two verifier agents checking evidence",
  },
  {
    title: "The debate becomes audio",
    description: "The verified debate is finalized and voiced with Fish Audio text-to-speech.",
    image: "/images/how-it-works/05-audio.png",
    imageAlt: "Two dialogue streams merging into an audio waveform",
  },
  {
    title: "Play it or keep it",
    description: "Play the finished MP3 whenever you want or download it for offline listening.",
    image: "/images/how-it-works/06-mp3.png",
    imageAlt: "Playable and downloadable podcast file",
  },
];

const researchPapers = [
  {
    title: "Debate improves writing",
    authors: "Modern Language Journal · 2020",
    description:
      "In a controlled study of 146 secondary students, debate instruction significantly improved several measures of second-language writing.",
    href: "https://doi.org/10.1111/modl.12673",
  },
  {
    title: "Debate builds better arguments",
    authors: "System · 2021",
    description:
      "Across eight secondary-school classes, debate instruction improved structural and quality measures of written and oral argumentation.",
    href: "https://doi.org/10.1016/j.system.2021.102576",
  },
  {
    title: "Debate raises subject knowledge",
    authors: "American Journal of Pharmaceutical Education · 2024",
    description:
      "Among 46 pharmacy students, quiz scores rose from 66.5% to 80.7% after a structured debate on universal healthcare.",
    href: "https://doi.org/10.1016/j.ajpe.2024.100724",
  },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const { auth } = await searchParams;
  const authReason = auth === "oauth" || auth === "required" ? auth : null;

  return (
    <div className="flex min-h-svh flex-col overflow-x-clip px-5 sm:px-8">
      <LandingHeader />
      {authReason ? <AuthDialog reason={authReason} /> : null}

      <main className="w-full">
        <section className="relative isolate left-1/2 min-h-[calc(100svh-4rem)] w-screen -translate-x-1/2 overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 opacity-30">
            <FloatingLines
              animationSpeed={0.35}
              enabledWaves={["middle", "bottom"]}
              interactive={false}
              lineCount={[5, 7]}
              lineDistance={[4, 5]}
              mixBlendMode="normal"
              parallax={false}
            />
          </div>

          <div className="relative z-10 flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center py-20 text-center sm:py-24">
            <h1 className="max-w-4xl text-balance font-mono text-5xl leading-[0.98] font-normal tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Learn like never before.
            </h1>

            <p className="mt-8 max-w-2xl text-pretty text-xl leading-relaxed text-muted-foreground">
              Choose something you want to understand and the time you have available.
              Yappa.ai creates a researched debate podcast that explores both sides
              before you reach your destination.
            </p>

            <div className="mt-10 flex scroll-mt-32 flex-wrap gap-3" id="start">
              <Button
                className="min-h-11 px-5"
                nativeButton={false}
                render={<Link href="/home" />}
                size="lg"
              >
                Try it now
              </Button>
              <Button
                className="min-h-11 px-5"
                nativeButton={false}
                render={<Link href="/#demos" />}
                size="lg"
                variant="outline"
              >
                See demo
              </Button>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-5xl">
          <DemoStack />

        <section
          className="relative py-24 before:absolute before:top-0 before:left-1/2 before:w-screen before:-translate-x-1/2 before:border-t before:border-border before:content-[''] sm:py-32"
          id="features"
        >
          <div className="max-w-2xl">
            <h2 className="text-balance font-mono text-3xl leading-tight tracking-[-0.03em] sm:text-4xl">
              Learning, from both sides.
            </h2>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
              Turn a question into a debate worth listening to, with two perspectives,
              real sources, and room to form your own view.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <article
                className="overflow-hidden rounded-xl border border-border"
                key={feature.title}
              >
                <div className="relative aspect-[5/4] bg-muted">
                  <Image
                    alt={feature.imageAlt}
                    className="object-cover"
                    fill
                    sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                    src={feature.image}
                  />
                </div>
                <div className="flex min-h-52 flex-col justify-between p-6">
                  <span className="font-mono text-xs text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-xl font-medium">{feature.title}</h3>
                    <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          className="relative scroll-mt-24 py-24 before:absolute before:top-0 before:left-1/2 before:w-screen before:-translate-x-1/2 before:border-t before:border-border before:content-[''] sm:py-32"
          id="how-it-works"
        >
          <div className="max-w-2xl">
            <h2 className="text-balance font-mono text-3xl leading-tight tracking-[-0.03em] sm:text-4xl">
              From a topic to an episode.
            </h2>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
              Six steps turn your curiosity into a researched, verified debate you can play,
              follow, and download whenever you want to keep learning.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {howItWorks.map((step, index) => (
              <article
                className="overflow-hidden rounded-xl border border-border"
                key={step.title}
              >
                <div className="aspect-square bg-muted p-5">
                  <Image
                    alt={step.imageAlt}
                    className="h-full w-full object-contain"
                    height={512}
                    sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                    src={step.image}
                    width={512}
                  />
                </div>
                <div className="p-6">
                  <span className="font-mono text-xs text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-5 text-xl font-medium">{step.title}</h3>
                  <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          className="relative scroll-mt-24 py-24 before:absolute before:top-0 before:left-1/2 before:w-screen before:-translate-x-1/2 before:border-t before:border-border before:content-[''] sm:py-32"
          id="evidence"
        >
          <div className="max-w-2xl">
            <p className="font-mono text-xs text-muted-foreground">The evidence</p>
            <h2 className="mt-4 text-balance font-mono text-3xl leading-tight tracking-[-0.03em] sm:text-4xl">
              Why debate belongs in the learning loop.
            </h2>
            <p className="mt-4 max-w-3xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Research does not show debate is the best method for every subject. It does show
              that structured, evidence-led argument can deepen content learning, sharpen
              reasoning, and make difficult ideas easier to examine from more than one angle.
            </p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {researchPapers.map((paper) => (
              <article
                className="grid h-80 grid-rows-[3.5rem_2.5rem_1fr_auto] gap-0 rounded-xl border border-border p-6"
                key={paper.title}
              >
                <h3 className="line-clamp-2 text-xl font-medium">{paper.title}</h3>
                <p className="line-clamp-2 font-mono text-xs leading-relaxed text-muted-foreground">
                  {paper.authors}
                </p>
                <p className="line-clamp-4 pt-4 text-pretty leading-relaxed text-muted-foreground">
                  {paper.description}
                </p>
                <a
                  className="inline-flex min-h-11 items-center gap-1 text-sm font-medium underline underline-offset-4 hover:text-muted-foreground"
                  href={paper.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  Read the paper
                  <ArrowUpRight aria-hidden="true" className="size-3.5" />
                </a>
              </article>
            ))}
          </div>
        </section>

        <section
          className="relative scroll-mt-24 py-24 before:absolute before:top-0 before:left-1/2 before:w-screen before:-translate-x-1/2 before:border-t before:border-border before:content-[''] sm:py-32"
          id="use-cases"
        >
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance font-mono text-3xl leading-tight tracking-[-0.03em] sm:text-4xl">
              Made for the time you already have.
            </h2>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
              Set the topic, choose the time you already have, and let Yappa.ai shape the
              conversation around the moment you want to use for learning.
            </p>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-3">
            {useCases.map((useCase) => (
              <article
                className="flex min-h-64 flex-col bg-background p-6 sm:p-8"
                key={useCase.title}
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {useCase.context}
                </span>
                <div className="mt-auto pt-16">
                  <h3 className="text-2xl font-medium lg:min-h-8">{useCase.title}</h3>
                  <p className="mt-3 text-pretty leading-relaxed text-muted-foreground lg:min-h-[4.5rem]">
                    {useCase.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="pricing-heading"
          className="relative scroll-mt-24 py-24 before:absolute before:top-0 before:left-1/2 before:w-screen before:-translate-x-1/2 before:border-t before:border-border before:content-[''] sm:py-32"
          id="pricing"
        >
          <div className="max-w-2xl">
            <p className="font-mono text-xs text-muted-foreground">Plans</p>
            <h2
              className="mt-4 text-balance font-mono text-3xl leading-tight tracking-[-0.03em] sm:text-4xl"
              id="pricing-heading"
            >
              Start with a question.
            </h2>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
              Explore Yappa.ai for free today, build a listening habit around the questions
              you care about, and choose more room to explore as the experience grows.
            </p>
          </div>

          <div className="mt-12">
            <PricingCards />
          </div>
        </section>

        <section
          className="relative scroll-mt-24 py-24 before:absolute before:top-0 before:left-1/2 before:w-screen before:-translate-x-1/2 before:border-t before:border-border before:content-[''] sm:py-32"
          aria-labelledby="philosophy-heading"
          id="philosophy"
        >
          <div className="rounded-2xl border border-border bg-background px-6 py-16 text-foreground sm:px-10 sm:py-20">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
              <div>
                <p className="font-mono text-xs text-foreground/60">The Yappa.ai philosophy</p>
                <h2
                  className="mt-5 max-w-xl text-balance font-mono text-3xl leading-tight tracking-[-0.03em] sm:text-4xl"
                  id="philosophy-heading"
                >
                  Learning gets deeper when you can hear more than one way to see.
                </h2>
              </div>

              <div className="max-w-2xl">
                <p className="text-pretty text-lg leading-relaxed text-foreground/75">
                  Yappa.ai is built on a simple belief: the goal of learning is not to collect
                  the fastest answer. It is to understand a question well enough to notice
                  its assumptions, weigh its trade-offs, and decide what you think. A debate
                  gives that process a shape you can follow. One voice makes a claim, another
                  tests it, and the space between them gives you room to look again.
                </p>

                <div className="mt-12 space-y-10 border-t border-foreground/15 pt-10">
                  <article>
                    <h3 className="text-xl font-medium">Language lives in context.</h3>
                    <p className="mt-3 text-pretty leading-relaxed text-foreground/65">
                      A new language is more than a list of vocabulary and grammar rules. It
                      is rhythm, hesitation, emphasis, disagreement, and the small phrases
                      people use to make an idea clearer. Listening to two speakers work
                      through a real question gives you those patterns in motion. You hear
                      the same idea explained from different angles, meet useful words in a
                      meaningful context, and begin to recognize how a thought changes when
                      the speaker is curious, doubtful, certain, or willing to concede.
                    </p>
                  </article>

                  <article>
                    <h3 className="text-xl font-medium">Opinions should be built, not borrowed.</h3>
                    <p className="mt-3 text-pretty leading-relaxed text-foreground/65">
                      It is easy to inherit a position from the loudest voice in the room.
                      It is harder, and more valuable, to understand the strongest case on
                      both sides before choosing your own. Yappa.ai does not ask you to accept a
                      verdict. It lets you follow the evidence, see where each argument is
                      strong or limited, and form a view that belongs to you. Changing your
                      mind is not a failure in that process; it is evidence that you were
                      paying attention.
                    </p>
                  </article>

                  <article>
                    <h3 className="text-xl font-medium">A second perspective helps you look again.</h3>
                    <p className="mt-3 text-pretty leading-relaxed text-foreground/65">
                      The first explanation we hear often becomes the frame through which we
                      interpret everything else. A thoughtful opposing view interrupts that
                      shortcut. It makes hidden premises visible, separates a genuine
                      disagreement from a difference in definitions, and shows which parts of
                      an idea survive serious questioning. That slower second look is where
                      understanding becomes more durable: not because every side is equally
                      right, but because you can now see the shape of the question more
                      clearly.
                    </p>
                  </article>

                  <article>
                    <h3 className="text-xl font-medium">The point is a wider view.</h3>
                    <p className="mt-3 text-pretty leading-relaxed text-foreground/65">
                      Good debate is not performance for its own sake. It is a way to practice
                      intellectual flexibility without giving up judgment. You can understand
                      why someone reaches a conclusion, recognize the values underneath it,
                      and still disagree with the result. Over time, that habit unlocks new
                      perspectives: on the topic you started with, on the people who see it
                      differently, and on the limits of your own first impression. Every Yappa.ai
                      episode is an invitation to leave with a better question, not just a
                      louder answer.
                    </p>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </section>

        </div>
      </main>

      <FooterBar />
    </div>
  );
}
