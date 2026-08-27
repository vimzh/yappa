"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { ArrowLeft, FileText, LoaderCircle, MessageCircleQuestion, Trash2 } from "lucide-react";

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
import { apiFetch, apiUrl } from "@/lib/api";


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

type ArticleFollowUp = {
  sideA: { response: string; sourceIndexes: number[] };
  sideB: { response: string; sourceIndexes: number[] };
  takeaway: string;
};

type Transcript = {
  title: string;
  summary: string;
  turns: Array<{
    speaker: "A" | "B";
    delivery: string;
    text: string;
    pauseAfter: string;
    claimIds: string[];
  }>;
  conclusion: string;
};

type Podcast = {
  id: string;
  topic: string;
  title: string;
  status: string;
  qualityScore: number | null;
  hasAudio: boolean;
  createdAt: string;
  transcript: Transcript | null;
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

function FollowUpCitations({
  sourceIndexes,
  sources,
}: {
  sourceIndexes: number[];
  sources: Source[];
}) {
  return (
    <p className="mt-3 font-mono text-xs text-muted-foreground">
      Sources{" "}
      {sourceIndexes.map((sourceIndex, index) => {
        const source = sources[sourceIndex - 1];
        if (!source) return null;
        return (
          <span key={sourceIndex}>
            {index > 0 ? ", " : null}
            <a
              className="underline decoration-border underline-offset-2 hover:decoration-foreground"
              href={source.url}
              rel="noreferrer"
              target="_blank"
            >
              [{sourceIndex}]
            </a>
          </span>
        );
      })}
    </p>
  );
}

function ArticleQuestion({
  passage,
  podcastId,
  sources,
}: {
  passage: string;
  podcastId: string;
  sources: Source[];
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<ArticleFollowUp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setAnswer(null);
    setError(null);

    try {
      const response = await apiFetch(`/podcasts/${podcastId}/article/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passage, question }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(readError(body, "The debate could not answer that question."));
      }
      setAnswer(body as ArticleFollowUp);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The debate could not answer that question.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5 border-y border-border bg-muted/30 px-4 py-5 sm:px-5">
      <form onSubmit={submitQuestion}>
        <label className="font-mono text-sm" htmlFor="article-question">
          Ask both sides about this point
        </label>
        <textarea
          className="mt-3 min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          disabled={loading}
          id="article-question"
          maxLength={400}
          minLength={8}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="What assumption is each side making here?"
          required
          value={question}
        />
        <div className="mt-3 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Answers use this episode’s verified transcript and sources.
          </p>
          <Button className="h-11 shrink-0" disabled={loading} type="submit">
            {loading ? (
              <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            ) : (
              <MessageCircleQuestion aria-hidden="true" className="size-4" />
            )}
            {loading ? "Asking…" : "Ask the debate"}
          </Button>
        </div>
      </form>

      {error ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {answer ? (
        <div aria-live="polite" className="mt-7 border-t border-border pt-6">
          <div className="grid gap-7 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-border">
            <div className="sm:pr-6">
              <p className="font-mono text-xs text-muted-foreground">Maya’s view</p>
              <p className="mt-3 leading-relaxed">{answer.sideA.response}</p>
              <FollowUpCitations sourceIndexes={answer.sideA.sourceIndexes} sources={sources} />
            </div>
            <div className="border-t border-border pt-6 sm:border-t-0 sm:pl-6 sm:pt-0">
              <p className="font-mono text-xs text-muted-foreground">Rowan’s view</p>
              <p className="mt-3 leading-relaxed">{answer.sideB.response}</p>
              <FollowUpCitations sourceIndexes={answer.sideB.sourceIndexes} sources={sources} />
            </div>
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <p className="font-mono text-xs text-muted-foreground">Where they disagree</p>
            <p className="mt-2 leading-relaxed">{answer.takeaway}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ArticleView({
  article,
  podcastId,
  sources,
}: {
  article: Article;
  podcastId: string;
  sources: Source[];
}) {
  const [selectedPassage, setSelectedPassage] = useState<string | null>(null);
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
          {article.sections.map((section, sectionIndex) => (
            <section className="mt-12 first:mt-0" key={section.heading}>
              <h3 className="text-balance font-mono text-2xl tracking-[-0.035em]">
                {section.heading}
              </h3>
              <div className="mt-5 space-y-6 text-pretty text-lg leading-[1.72]">
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <div key={`${section.heading}-${paragraphIndex}`}>
                    <p>
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
                    {selectedPassage === `${sectionIndex}-${paragraphIndex}` ? (
                      <ArticleQuestion
                        passage={paragraph.text}
                        podcastId={podcastId}
                        sources={sources}
                      />
                    ) : (
                      <Button
                        className="mt-3 -ml-3 h-11 px-3 text-muted-foreground hover:text-foreground"
                        onClick={() => setSelectedPassage(`${sectionIndex}-${paragraphIndex}`)}
                        type="button"
                        variant="ghost"
                      >
                        <MessageCircleQuestion aria-hidden="true" className="size-4" />
                        Ask both sides
                      </Button>
                    )}
                  </div>
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

function TranscriptDialog({
  podcastTitle,
  transcript,
}: {
  podcastTitle: string;
  transcript: Transcript;
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button className="h-11 shrink-0 px-4" variant="outline" />}>
        <FileText aria-hidden="true" className="size-4" />
        Transcript
      </DialogTrigger>
      <DialogContent className="max-h-[85svh] min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Full transcript</DialogTitle>
          <DialogDescription>
            {podcastTitle} · {transcript.turns.length} turns
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto pr-2">
          <div className="space-y-5">
            {transcript.turns.map((turn, index) => (
              <div
                className="grid gap-2 border-b border-border pb-5 last:border-0 last:pb-0 sm:grid-cols-[5rem_minmax(0,1fr)]"
                key={`${turn.speaker}-${index}`}
              >
                <p className="font-mono text-xs text-muted-foreground">
                  {turn.speaker === "A" ? "Maya" : "Rowan"}
                </p>
                <p className="leading-relaxed">{turn.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t pt-5">
            <p className="font-mono text-xs text-muted-foreground">Conclusion</p>
            <p className="mt-2 leading-relaxed">{transcript.conclusion}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
        const response = await apiFetch(`/podcasts/${id}`);
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
        const response = await apiFetch(`/podcasts/${id}`);
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
      const response = await apiFetch(`/podcasts/${id}/article`, {
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
      const response = await apiFetch(`/podcasts/${id}`, { method: "DELETE" });
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

      {podcast.hasAudio || podcast.transcript?.turns.length ? (
        <div className="mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center">
          {podcast.hasAudio ? (
            <AudioPlayer
              className="flex-1"
              src={`${apiUrl}/podcasts/${podcast.id}/audio`}
              title={podcast.title}
            />
          ) : null}
          {podcast.transcript?.turns.length ? (
            <TranscriptDialog podcastTitle={podcast.title} transcript={podcast.transcript} />
          ) : null}
        </div>
      ) : null}

      {podcast.article ? (
        <ArticleView article={podcast.article} podcastId={podcast.id} sources={sources} />
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
