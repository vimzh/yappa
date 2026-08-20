"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CalendarClock, LoaderCircle, Pause, Play, Plus } from "lucide-react";

import { AudioPlayer } from "@/components/audio-player";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3101";

const activeStatuses = new Set([
  "queued",
  "researching",
  "verifying",
  "writing",
  "synthesizing",
]);

const statusLabels: Record<string, string> = {
  scheduled: "Scheduled",
  queued: "Waiting to start",
  researching: "Both sides are researching",
  verifying: "Checking every source",
  writing: "Editing the debate",
  synthesizing: "Creating the audio",
  ready: "Ready to play",
  failed: "Generation failed",
};

type Podcast = {
  id: string;
  topic: string;
  title: string;
  status: string;
  progress: number;
  transcriptIterations: number;
  qualityScore: number | null;
  error: string | null;
  hasAudio: boolean;
  scheduledFor: string | null;
  createdAt: string;
};

type Interest = {
  id: string;
  topic: string;
};

type RequestState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "retrying"; id: string }
  | {
      status: "error";
      message: string;
      field: "interests" | "schedule" | null;
    };

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const nextPodcastFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function toLocalDateTimeInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function getStatusLabel(podcast: Podcast) {
  if (podcast.status === "scheduled" && podcast.scheduledFor) {
    return `Scheduled for ${dateTimeFormatter.format(new Date(podcast.scheduledFor))}`;
  }
  return statusLabels[podcast.status] ?? podcast.status;
}

function ReadyPodcastHero({ podcast }: { podcast: Podcast }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setPlaybackError(true);
      }
    } else {
      audio.pause();
    }
  }

  return (
    <section
      aria-labelledby="ready-podcast-heading"
      className="rounded-2xl bg-foreground px-6 py-8 text-background sm:px-9 sm:py-10"
    >
      <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center">
        <Button
          aria-label={playing ? `Pause ${podcast.title}` : `Play ${podcast.title}`}
          className="size-20 shrink-0 rounded-full border-background bg-background text-foreground hover:bg-background/85 [&_svg]:size-8"
          onClick={togglePlayback}
          size="icon"
          type="button"
          variant="outline"
        >
          {playing ? (
            <Pause aria-hidden="true" />
          ) : (
            <Play aria-hidden="true" className="translate-x-0.5" />
          )}
        </Button>
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-background/65">
            Your podcast is ready
          </p>
          <h2
            className="mt-3 text-balance font-mono text-2xl tracking-[-0.04em] sm:text-3xl"
            id="ready-podcast-heading"
          >
            {podcast.title}
          </h2>
          <p className="mt-3 text-background/65">
            Press play whenever you’re ready to learn.
            {podcast.qualityScore === null
              ? ""
              : ` Quality score: ${podcast.qualityScore}/100.`}
          </p>
          {playbackError ? (
            <p className="mt-3 text-sm text-background" role="alert">
              Audio couldn’t start. Try again.
            </p>
          ) : null}
        </div>
      </div>
      <audio
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => {
          setPlaybackError(false);
          setPlaying(true);
        }}
        preload="metadata"
        ref={audioRef}
        src={`${apiUrl}/podcasts/${podcast.id}/audio`}
      />
    </section>
  );
}

function NextPodcastStatus({ podcast }: { podcast: Podcast | null }) {
  const preparationStatus = podcast
    ? podcast.hasAudio
      ? "Prepared and waiting"
      : podcast.status === "failed"
        ? "Needs attention"
        : activeStatuses.has(podcast.status)
          ? `Preparing now · ${podcast.progress}%`
          : "Queued to prepare"
    : null;

  return (
    <section
      aria-labelledby="next-podcast-heading"
      className="border-y py-5 sm:py-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full border bg-muted/50">
            <CalendarClock aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <h2
              className="text-sm text-muted-foreground"
              id="next-podcast-heading"
            >
              Your next podcast will be ready on
            </h2>
            {podcast?.scheduledFor ? (
              <>
                <time
                  className="mt-1 block text-balance font-mono text-xl tracking-[-0.03em] sm:text-2xl"
                  dateTime={podcast.scheduledFor}
                >
                  {nextPodcastFormatter.format(new Date(podcast.scheduledFor))}
                </time>
                <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
                  {podcast.title}
                </p>
              </>
            ) : (
              <p className="mt-1 font-mono text-xl tracking-[-0.03em]">
                Nothing scheduled yet
              </p>
            )}
          </div>
        </div>
        <p className="pl-15 text-sm font-medium tabular-nums sm:pl-0">
          {preparationStatus ?? "Choose a time for your next podcast"}
        </p>
      </div>
    </section>
  );
}

function PodcastProgress({ podcast }: { podcast: Podcast }) {
  if (!activeStatuses.has(podcast.status)) return null;

  return (
    <div className="mt-4">
      <progress
        aria-label={`${getStatusLabel(podcast)}: ${podcast.progress}%`}
        className="h-1 w-full accent-foreground"
        max="100"
        value={podcast.progress}
      />
    </div>
  );
}

function PodcastAudio({ podcast }: { podcast: Podcast }) {
  if (!podcast.hasAudio) return null;

  return (
    <AudioPlayer
      className="mt-4"
      src={`${apiUrl}/podcasts/${podcast.id}/audio`}
      title={podcast.title}
    />
  );
}

function RetryButton({
  podcast,
  retrying,
  onRetry,
}: {
  podcast: Podcast;
  retrying: boolean;
  onRetry: (podcast: Podcast) => void;
}) {
  if (podcast.status !== "failed") return null;

  return (
    <Button
      className="mt-4 h-11 px-4"
      disabled={retrying}
      onClick={() => onRetry(podcast)}
      type="button"
      variant="outline"
    >
      {retrying ? (
        <LoaderCircle
          aria-hidden="true"
          className="animate-spin motion-reduce:animate-none"
        />
      ) : null}
      Retry podcast
    </Button>
  );
}

function PodcastCard({
  podcast,
  retrying,
  onRetry,
}: {
  podcast: Podcast;
  retrying: boolean;
  onRetry: (podcast: Podcast) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Link
            className="underline decoration-transparent underline-offset-4 transition-colors hover:decoration-foreground"
            href={`/podcasts/${podcast.id}`}
          >
            {podcast.title}
          </Link>
        </CardTitle>
        <CardDescription>{podcast.topic}</CardDescription>
      </CardHeader>
      <CardContent className="border-t pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="mt-1 font-medium">{getStatusLabel(podcast)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Quality</p>
            <p className="mt-1 font-medium tabular-nums">
              {podcast.qualityScore === null
                ? "Pending"
                : `${podcast.qualityScore}/100`}
            </p>
          </div>
        </div>
        <PodcastProgress podcast={podcast} />
        <PodcastAudio podcast={podcast} />
        {podcast.error ? (
          <p className="mt-4 text-sm text-destructive">{podcast.error}</p>
        ) : null}
        <RetryButton
          onRetry={onRetry}
          podcast={podcast}
          retrying={retrying}
        />
      </CardContent>
    </Card>
  );
}

function PodcastTable({
  podcasts,
  retryingId,
  onRetry,
}: {
  podcasts: Podcast[];
  retryingId: string | null;
  onRetry: (podcast: Podcast) => void;
}) {
  return (
    <div className="mt-8 hidden overflow-x-auto rounded-xl border lg:block">
      <table className="w-full min-w-4xl text-left text-sm">
        <caption className="sr-only">
          Your podcasts and their generation status
        </caption>
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-5 py-3 font-medium" scope="col">
              Podcast
            </th>
            <th className="px-5 py-3 font-medium" scope="col">
              Status
            </th>
            <th className="px-5 py-3 text-right font-medium" scope="col">
              Quality
            </th>
            <th className="px-5 py-3 font-medium" scope="col">
              Audio
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {podcasts.map((podcast) => (
            <tr key={podcast.id}>
              <td className="max-w-sm px-5 py-4">
                <Link
                  className="line-clamp-2 font-medium underline decoration-transparent underline-offset-4 transition-colors hover:decoration-foreground"
                  href={`/podcasts/${podcast.id}`}
                >
                  {podcast.title}
                </Link>
                <p className="mt-1 line-clamp-1 text-muted-foreground">
                  {podcast.topic}
                </p>
              </td>
              <td className="w-64 px-5 py-4">
                <p>{getStatusLabel(podcast)}</p>
                <PodcastProgress podcast={podcast} />
                {podcast.error ? (
                  <p className="mt-2 max-w-64 text-destructive">
                    {podcast.error}
                  </p>
                ) : null}
              </td>
              <td className="px-5 py-4 text-right tabular-nums">
                {podcast.qualityScore === null
                  ? "Pending"
                  : `${podcast.qualityScore}/100`}
              </td>
              <td className="w-80 px-5 py-4">
                {podcast.hasAudio ? (
                  <PodcastAudio podcast={podcast} />
                ) : podcast.status === "failed" ? (
                  <RetryButton
                    onRetry={onRetry}
                    podcast={podcast}
                    retrying={retryingId === podcast.id}
                  />
                ) : (
                  <span className="text-muted-foreground">Not ready</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PodcastWorkspace() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [request, setRequest] = useState<RequestState>({ status: "idle" });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState(0);
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [scheduleDefaults, setScheduleDefaults] = useState({
    min: "",
    value: "",
  });
  const actionError =
    request.status === "error" && request.field === null
      ? request.message
      : null;
  const readyPodcast = podcasts.find((podcast) => podcast.hasAudio);
  const nextPodcast = podcasts
    .filter(
      (podcast) =>
        podcast.scheduledFor &&
        Date.parse(podcast.scheduledFor) > refreshedAt,
    )
    .sort(
      (first, second) =>
        Date.parse(first.scheduledFor ?? "") -
        Date.parse(second.scheduledFor ?? ""),
    )[0] ?? null;

  useEffect(() => {
    let mounted = true;

    async function refreshPodcasts() {
      try {
        const response = await fetch(`${apiUrl}/podcasts`);
        if (!response.ok) throw new Error(`API returned ${response.status}.`);
        const data = (await response.json()) as Podcast[];
        if (mounted) {
          setPodcasts(data);
          setLoaded(true);
          setRefreshedAt(Date.now());
          setLoadError(null);
        }
      } catch {
        if (mounted) {
          setLoaded(true);
          setLoadError("Couldn’t load podcasts. Check that the API is running.");
        }
      }
    }

    async function loadInterests() {
      try {
        const response = await fetch(`${apiUrl}/interests`);
        if (!response.ok) throw new Error();
        if (mounted) setInterests((await response.json()) as Interest[]);
      } catch {
        if (mounted) {
          setLoadError("Couldn’t load interests. Check that the API is running.");
        }
      }
    }

    void refreshPodcasts();
    void loadInterests();
    const interval = window.setInterval(refreshPodcasts, 3_000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  async function handleSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const selectedIds = formData.getAll("interest").map(String);
    const selectedTopics = interests.filter((interest) =>
      selectedIds.includes(interest.id),
    );
    const scheduledAt = String(formData.get("scheduledFor") ?? "");
    const scheduledFor = new Date(scheduledAt);

    if (selectedTopics.length === 0) {
      setRequest({
        status: "error",
        message: "Choose at least one interest.",
        field: "interests",
      });
      return;
    }
    if (Number.isNaN(scheduledFor.getTime()) || scheduledFor <= new Date()) {
      setRequest({
        status: "error",
        message: "Choose a time in the future.",
        field: "schedule",
      });
      return;
    }

    setRequest({ status: "submitting" });

    try {
      const response = await fetch(`${apiUrl}/podcasts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: `Debate: ${selectedTopics
            .map((interest) => interest.topic)
            .join(" and ")}`,
          scheduledFor: scheduledFor.toISOString(),
          maxIterations: 5,
        }),
      });
      const body = (await response.json()) as Podcast | { error: string };

      if (!response.ok) {
        throw new Error(
          "error" in body && typeof body.error === "string"
            ? body.error
            : "Podcast could not be scheduled.",
        );
      }

      setPodcasts((current) => [body as Podcast, ...current]);
      setRequest({ status: "idle" });
      setSchedulerOpen(false);
      form.reset();
    } catch (caught) {
      setRequest({
        status: "error",
        message:
          caught instanceof Error
            ? caught.message
            : "Podcast could not be scheduled.",
        field: null,
      });
    }
  }

  async function handleRetry(podcast: Podcast) {
    setRequest({ status: "retrying", id: podcast.id });

    try {
      const response = await fetch(`${apiUrl}/podcasts/${podcast.id}/retry`, {
        method: "POST",
      });
      const body = (await response.json()) as Podcast | { error: string };
      if (!response.ok) {
        throw new Error(
          "error" in body && typeof body.error === "string"
            ? body.error
            : "Podcast could not be retried.",
        );
      }

      setPodcasts((current) =>
        current.map((item) =>
          item.id === podcast.id ? (body as Podcast) : item,
        ),
      );
      setRequest({ status: "idle" });
    } catch (caught) {
      setRequest({
        status: "error",
        message:
          caught instanceof Error
            ? caught.message
            : "Podcast could not be retried.",
        field: null,
      });
    }
  }

  function toggleScheduler() {
    setRequest({ status: "idle" });
    if (!schedulerOpen) {
      const now = new Date();
      setScheduleDefaults({
        min: toLocalDateTimeInput(now),
        value: toLocalDateTimeInput(new Date(now.getTime() + 60 * 60_000)),
      });
    }
    setSchedulerOpen((open) => !open);
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="sr-only">Yappa home</h1>

      {readyPodcast ? (
        <ReadyPodcastHero key={readyPodcast.id} podcast={readyPodcast} />
      ) : null}

      <div className={readyPodcast ? "mt-6" : ""}>
        <NextPodcastStatus podcast={nextPodcast} />
      </div>

      <section
        aria-labelledby="home-heading"
        className="mt-14"
      >
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Home
            </p>
            <h2
              className="mt-3 font-mono text-3xl tracking-[-0.04em] sm:text-4xl"
              id="home-heading"
            >
              Your learning queue
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Schedule a debate now. Play it when the time comes.
            </p>
          </div>
          <Button
            aria-expanded={schedulerOpen}
            className="h-11 px-4"
            onClick={toggleScheduler}
            type="button"
          >
            <Plus aria-hidden="true" />
            New podcast
          </Button>
        </div>

        {schedulerOpen ? (
          <form
            className="mt-8 rounded-xl border p-5 sm:p-6"
            onSubmit={handleSchedule}
          >
            <fieldset
              aria-describedby={
                request.status === "error" && request.field === "interests"
                  ? "interests-error"
                  : undefined
              }
            >
              <legend className="text-sm font-medium">Choose interests</legend>
              {interests.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No interests saved.{" "}
                  <Link
                    className="text-foreground underline underline-offset-4"
                    href="/interests"
                  >
                    Add your first interest
                  </Link>
                  .
                </p>
              ) : (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {interests.map((interest) => (
                    <label
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 has-checked:border-foreground has-checked:bg-muted"
                      key={interest.id}
                    >
                      <input
                        className="size-4 accent-foreground"
                        name="interest"
                        type="checkbox"
                        value={interest.id}
                      />
                      <span>{interest.topic}</span>
                    </label>
                  ))}
                </div>
              )}
              {request.status === "error" &&
              request.field === "interests" ? (
                <p
                  className="mt-3 text-sm text-destructive"
                  id="interests-error"
                  role="alert"
                >
                  {request.message}
                </p>
              ) : null}
            </fieldset>

            <div className="mt-6 max-w-sm">
              <Label htmlFor="scheduled-for">Ready by</Label>
              <Input
                aria-describedby={
                  request.status === "error" && request.field === "schedule"
                    ? "schedule-error"
                    : undefined
                }
                aria-invalid={
                  request.status === "error" && request.field === "schedule"
                }
                className="mt-2 h-11 px-3 text-base md:text-base"
                defaultValue={scheduleDefaults.value}
                id="scheduled-for"
                min={scheduleDefaults.min}
                name="scheduledFor"
                required
                type="datetime-local"
              />
              {request.status === "error" && request.field === "schedule" ? (
                <p
                  className="mt-3 text-sm text-destructive"
                  id="schedule-error"
                  role="alert"
                >
                  {request.message}
                </p>
              ) : null}
            </div>

            <Button
              className="mt-6 h-11 px-4"
              disabled={request.status === "submitting" || interests.length === 0}
              type="submit"
            >
              {request.status === "submitting" ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="animate-spin motion-reduce:animate-none"
                />
              ) : null}
              Schedule podcast
            </Button>
            {actionError ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {actionError}
              </p>
            ) : null}
          </form>
        ) : null}

        {loadError ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {loadError}
          </p>
        ) : null}
      </section>

      <section className="mt-16" aria-labelledby="your-podcasts-heading">
        <h2
          className="font-mono text-2xl tracking-[-0.03em]"
          id="your-podcasts-heading"
        >
          Your podcasts
        </h2>
        <p className="mt-2 text-muted-foreground">
          Upcoming, generating, and ready to play.
        </p>

        {!loaded ? (
          <p className="mt-8 text-sm text-muted-foreground" role="status">
            Loading podcasts…
          </p>
        ) : podcasts.length === 0 ? (
          <div className="mt-8 border-y py-10">
            <p className="font-medium">No podcasts yet.</p>
            <p className="mt-2 text-muted-foreground">
              Create one from your saved interests above.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 lg:hidden">
              {podcasts.map((podcast) => (
                <PodcastCard
                  key={podcast.id}
                  onRetry={handleRetry}
                  podcast={podcast}
                  retrying={
                    request.status === "retrying" && request.id === podcast.id
                  }
                />
              ))}
            </div>
            <PodcastTable
              onRetry={handleRetry}
              podcasts={podcasts}
              retryingId={request.status === "retrying" ? request.id : null}
            />
          </>
        )}
      </section>
    </div>
  );
}
