import { AnnouncementBanner } from "@/components/announcement-banner";
import { DemoStack } from "@/components/demo-stack";
import { FooterBar } from "@/components/footer-bar";
import { LandingHeader } from "@/components/landing-header";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

const features = [
  {
    title: "The debate, distilled",
    description: "Review the central arguments without replaying the full episode.",
  },
  {
    title: "Every cited source",
    description: "Open the references behind each claim and examine them yourself.",
  },
  {
    title: "Point-by-point attribution",
    description: "See which AI made every argument and continue down either path.",
  },
];

const useCases = [
  {
    context: "On the road",
    title: "Your commute, timed exactly",
    description:
      "Choose a topic and enter your drive time. Yappa prepares a debate podcast that finishes as you arrive.",
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
    description: "Tell Yappa what interests you and how long you want to listen.",
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

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col px-5 sm:px-8">
      <AnnouncementBanner />

      <LandingHeader />

      <main className="mx-auto w-full max-w-5xl">
        <section className="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center py-20 text-center sm:py-24">
          <h1 className="max-w-4xl text-balance font-mono text-5xl leading-[0.98] font-normal tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            Learn like never before.
          </h1>

          <p className="mt-8 max-w-2xl text-pretty text-xl leading-relaxed text-muted-foreground">
            Two LLMs debate opposite sides of an idea, turning every topic into a
            podcast. <span>Either way, you learn.</span>
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
              render={<a href="#how-it-works" />}
              size="lg"
              variant="outline"
            >
              See demo
            </Button>
          </div>
        </section>

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
              Turn a question into a debate worth listening to.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <article
                className="flex min-h-52 flex-col justify-between rounded-xl border border-border p-6"
                key={feature.title}
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-xl font-medium">{feature.title}</h3>
                  <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
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
              Six steps turn your curiosity into a verified debate you can play or download.
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
              Research does not show debate is the best method for every subject. It does show that structured, evidence-led argument can deepen content learning and reasoning.
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
                  className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4 hover:text-muted-foreground"
                  href={paper.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  Read the paper ↗
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
              Set the topic. Set the duration. Yappa handles the rest.
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
                  <h3 className="text-2xl font-medium">{useCase.title}</h3>
                  <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
                    {useCase.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          className="relative scroll-mt-24 py-24 before:absolute before:top-0 before:left-1/2 before:w-screen before:-translate-x-1/2 before:border-t before:border-border before:content-[''] sm:py-32"
          id="philosophy"
        >
          <div className="rounded-2xl bg-foreground px-6 py-16 text-background sm:px-10 sm:py-20">
            <p className="font-mono text-xs text-background/60">Beyond the episode</p>
            <h2 className="mt-5 max-w-3xl text-balance font-mono text-3xl leading-tight tracking-[-0.03em] sm:text-4xl">
              Every debate leaves a trail.
            </h2>
            <p className="mt-5 max-w-3xl text-pretty text-lg leading-relaxed text-background/70">
              Every podcast includes a companion learning article with the key arguments,
              every reference, and a clear record of which AI made each point.
            </p>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-background/15 bg-background/5 p-6">
                <h3 className="text-lg font-medium">The debate, distilled</h3>
                <p className="mt-2 text-sm leading-relaxed text-background/60">
                  Review the central arguments without replaying the full episode.
                </p>
              </div>
              <div className="rounded-xl border border-background/15 bg-background/5 p-6">
                <h3 className="text-lg font-medium">Every cited source</h3>
                <p className="mt-2 text-sm leading-relaxed text-background/60">
                  Open the references behind each claim and examine them yourself.
                </p>
              </div>
              <div className="rounded-xl border border-background/15 bg-background/5 p-6">
                <h3 className="text-lg font-medium">Point-by-point attribution</h3>
                <p className="mt-2 text-sm leading-relaxed text-background/60">
                  See which AI made every argument and continue down either path.
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>

      <FooterBar />
    </div>
  );
}
