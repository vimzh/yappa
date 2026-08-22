import { AudioPlayer } from "@/components/audio-player";

const demos = [
  {
    title: "Should AI agents use tools autonomously?",
    duration: "1 min",
    src: "/demos/ai-agents-tools.mp3",
  },
  {
    title: "Are cheaper models weaker products?",
    duration: "1 min",
    src: "/demos/model-distillation.mp3",
  },
  {
    title: "Should AI coding assistants be standard?",
    duration: "1 min",
    src: "/demos/ai-coding-assistants.mp3",
  },
];

/** A compact stack of real, playable Yappa episode samples for the landing hero. */
export function DemoStack() {
  return (
    <section
      aria-labelledby="demo-heading"
      className="relative scroll-mt-24 py-12 before:absolute before:top-0 before:left-1/2 before:w-screen before:-translate-x-1/2 before:border-t before:border-border before:content-[''] sm:py-16"
      id="demos"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-mono text-xl tracking-[-0.03em]" id="demo-heading">
          Hear a debate.
        </h2>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">03 demos</span>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {demos.map((demo, index) => (
          <article className="flex min-h-60 flex-col rounded-xl border border-border p-5" key={demo.src}>
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-mono text-xs text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </p>
              <p className="font-mono text-xs tabular-nums text-muted-foreground">
                {demo.duration}
              </p>
            </div>
            <h3 className="mt-3 text-base leading-snug font-medium">{demo.title}</h3>
            <AudioPlayer className="mt-auto pt-6" src={demo.src} title={demo.title} />
          </article>
        ))}
      </div>
    </section>
  );
}
