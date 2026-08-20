"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle, Trash2 } from "lucide-react";

import { AudioPlayer } from "@/components/audio-player";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3101";

type Source = {
  title: string;
  url: string;
  publisher: string;
};

type Article = {
  title: string;
  dek: string;
  sections: Array<{
    heading: string;
    paragraphs: Array<{ text: string; sourceIndexes: number[] }>;
  }>;
  generatedAt: string;
  wordCount: number;
  readingMinutes: number;
};

type Podcast = {
  id: string;
  topic: string;
  title: string;
  status: string;
  qualityScore: number | null;
  hasAudio: boolean;
  createdAt: string;
  transcript: { summary: string; conclusion: string } | null;
  sources: Source[] | null;
  article: Article | null;
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; podcast: Podcast }
  | { status: "error"; message: string };

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

function readError(body: unknown, fallback: string) {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    return body.error;
  }
  return fallback;
}

function ArticleView({ article, sources }: { article: Article; sources: Source[] }) {
  const citedIndexes = Array.from(
    new Set(
      article.sections.flatMap((section) =>
        section.paragraphs.flatMap((paragraph) => paragraph.sourceIndexes),
      ),
    ),
  ).sort((first, second) => first - second);

  return (
    <article className="mt-16 border-t pt-12" aria-labelledby="article-title">
      <header className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Learning article
        </p>
        <h2
          className="mt-4 text-balance font-mono text-3xl leading-tight tracking-[-0.04em] sm:text-5xl"
          id="article-title"
        >
          {article.title}
        </h2>
        <p className="mt-5 max-w-2xl text-pretty text-xl leading-relaxed text-muted-foreground">
          {article.dek}
        </p>
        <p className="mt-5 font-mono text-xs text-muted-foreground">
          {article.readingMinutes} min read · {article.wordCount.toLocaleString()} words · Generated {dateFormatter.format(new Date(article.generatedAt))}
        </p>
      </header>

      <div className="mt-12 grid gap-14 lg:grid-cols-[minmax(0,65ch)_18rem] lg:items-start lg:justify-between">
        <div className="min-w-0">
          {article.sections.map((section) => (
            <section className="mt-12 first:mt-0" key={section.heading}>
              <h3 className="text-balance font-mono text-2xl tracking-[-0.035em]">
                {section.heading}
              </h3>
              <div className="mt-5 space-y-6 text-pretty text-lg leading-[1.72]">
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <p key={`${section.heading}-${paragraphIndex}`}>
                    {paragraph.text}
                    {paragraph.sourceIndexes.length > 0 ? (
                      <sup className="ml-1 whitespace-nowrap font-mono text-[0.65em] leading-none">
                        {paragraph.sourceIndexes.map((sourceIndex) => (
                          <a
                            aria-label={`Reference ${sourceIndex}`}
                            className="ml-1 underline decoration-border underline-offset-2 hover:decoration-foreground"
                            href={`#reference-${sourceIndex}`}
                            key={sourceIndex}
                          >
                            [{sourceIndex}]
                          </a>
                        ))}
                      </sup>
                    ) : null}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="border-t pt-6 lg:sticky lg:top-8" aria-labelledby="references-heading">
          <h3 className="font-mono text-sm" id="references-heading">
            References
          </h3>
          <ol className="mt-5 space-y-5">
            {citedIndexes.map((sourceIndex) => {
              const source = sources[sourceIndex - 1];
              if (!source) return null;
              return (
                <li className="text-sm leading-relaxed" id={`reference-${sourceIndex}`} key={sourceIndex}>
                  <span className="mr-2 font-mono text-xs text-muted-foreground">
                    {sourceIndex}.
                  </span>
                  <a
                    className="underline decoration-border underline-offset-4 hover:decoration-foreground"
                    href={source.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {source.title}
                  </a>
                  <span className="mt-1 block pl-6 text-muted-foreground">
                    {source.publisher}
                  </span>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </article>
  );
}

function ArticlePrompt({
  ready,
  generating,
  error,
  onGenerate,
}: {
  ready: boolean;
  generating: boolean;
  error: string | null;
  onGenerate: () => void;
}) {
  return (
    <section className="mt-16 border-y py-10" aria-labelledby="article-prompt-title">
      <div className="flex max-w-3xl flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Beyond the episode
          </p>
          <h2 className="mt-3 font-mono text-2xl tracking-[-0.03em]" id="article-prompt-title">
            Turn this debate into an article.
          </h2>
          <p className="mt-3 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Get a balanced long-form read with the verified references attached to each claim.
          </p>
        </div>
        <Button
          className="h-11 shrink-0 px-4"
          disabled={!ready || generating}
          onClick={onGenerate}
          type="button"
        >
          {generating ? (
            <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          ) : null}
          {generating ? "Generating…" : "Generate article"}
        </Button>
      </div>
      {!ready ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Article generation becomes available after research and verification finish.
        </p>
      ) : null}
      {generating ? (
        <p aria-live="polite" className="mt-4 text-sm text-muted-foreground">
          Writing from the verified transcript and sources. This usually takes 20–60 seconds.
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error} Your podcast is unchanged.
        </p>
      ) : null}
    </section>
  );
}

export function PodcastDetail({ id }: { id: string }) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadPodcast() {
      try {
        const response = await fetch(`${apiUrl}/podcasts/${id}`);
        const body: unknown = await response.json();
        if (!response.ok) {
          throw new Error(readError(body, "Podcast could not be loaded."));
        }
        if (mounted) setState({ status: "ready", podcast: body as Podcast });
      } catch (error) {
        if (mounted) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Podcast could not be loaded.",
          });
        }
      }
    }

    void loadPodcast();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!generating) return;

    const interval = window.setInterval(async () => {
      try {
        const response = await fetch(`${apiUrl}/podcasts/${id}`);
        const body: unknown = await response.json();
        if (!response.ok || !(body as Podcast).article) return;
        setState({ status: "ready", podcast: body as Podcast });
        setGenerating(false);
      } catch {
        // Keep waiting: the original generation request is still authoritative.
      }
    }, 2_000);

    return () => window.clearInterval(interval);
  }, [generating, id]);

  async function generateArticle() {
    if (state.status !== "ready") return;
    setGenerating(true);
    setGenerationError(null);

    let waitingForExistingArticle = false;

    try {
      const response = await fetch(`${apiUrl}/podcasts/${id}/article`, {
        method: "POST",
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = readError(body, "Article generation failed. Try again.");
        if (response.status === 409 && message === "The article is already generating.") {
          waitingForExistingArticle = true;
          return;
        }
        throw new Error(message);
      }
      setState({
        status: "ready",
        podcast: { ...state.podcast, article: body as Article },
      });
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : "Article generation failed. Try again.",
      );
    } finally {
      if (!waitingForExistingArticle) setGenerating(false);
    }
  }

  async function deletePodcast() {
    setDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`${apiUrl}/podcasts/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(readError(await response.json(), "Podcast could not be deleted."));
      }
      router.push("/recording");
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Podcast could not be deleted.");
    } finally {
      setDeleting(false);
    }
  }

  if (state.status === "loading") {
    return <p className="text-muted-foreground" role="status">Loading podcast…</p>;
  }

  if (state.status === "error") {
    return (
      <div>
        <Link className="inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4" href="/recording">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to recordings
        </Link>
        <p className="mt-10 text-destructive" role="alert">{state.message}</p>
      </div>
    );
  }

  const { podcast } = state;
  const sources = podcast.sources ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex items-center justify-between gap-4">
        <Link className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/recording">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to recordings
        </Link>
        <Dialog>
          <DialogTrigger render={<Button className="text-destructive hover:text-destructive" variant="ghost" />}>
            <Trash2 aria-hidden="true" className="size-4" />
            Delete
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this podcast?</DialogTitle>
              <DialogDescription>
                This permanently removes the podcast, article, audio, and local research artifacts.
              </DialogDescription>
            </DialogHeader>
            {deleteError ? <p className="text-sm text-destructive" role="alert">{deleteError}</p> : null}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button disabled={deleting} onClick={deletePodcast} variant="destructive">
                {deleting ? "Deleting…" : "Delete podcast"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <header className="mt-8 max-w-4xl">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {podcast.status === "ready" ? "Ready to learn" : podcast.status}
        </p>
        <h1 className="mt-4 text-balance font-mono text-4xl leading-[1.05] tracking-[-0.045em] sm:text-6xl">
          {podcast.title}
        </h1>
        <p className="mt-5 max-w-2xl text-pretty text-xl leading-relaxed text-muted-foreground">
          {podcast.transcript?.summary ?? podcast.topic}
        </p>
        <p className="mt-5 font-mono text-xs text-muted-foreground">
          {dateFormatter.format(new Date(podcast.createdAt))}
          {podcast.qualityScore === null ? "" : ` · ${podcast.qualityScore}/100 quality`}
          {sources.length === 0 ? "" : ` · ${sources.length} verified sources`}
        </p>
      </header>

      {podcast.hasAudio ? (
        <AudioPlayer
          className="mt-10 max-w-2xl"
          src={`${apiUrl}/podcasts/${podcast.id}/audio`}
          title={podcast.title}
        />
      ) : null}

      {podcast.article ? (
        <ArticleView article={podcast.article} sources={sources} />
      ) : (
        <ArticlePrompt
          error={generationError}
          generating={generating}
          onGenerate={generateArticle}
          ready={podcast.status === "ready" && sources.length > 0}
        />
      )}
    </div>
  );
}
