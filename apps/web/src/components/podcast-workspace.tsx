"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CalendarClock, Clock3, LoaderCircle, Pause, Play, Plus } from "lucide-react";

import { AudioPlayer } from "@/components/audio-player";
import { readApiJson } from "@/lib/api-response";
import { apiFetch, apiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


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
  durationMinutes: number;
  transcriptIterations: number;
  qualityScore: number | null;
  error: string | null;
  hasAudio: boolean;
  scheduledFor: string | null;
  createdAt: string;
};

type GenerationQuota = {
  unlimited: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  allowedDurations: number[];
};

type CreatedPodcast = Podcast & { quota: GenerationQuota };

type RequestState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "retrying"; id: string }
  | {
      status: "error";
      message: string;
      field: "topic" | "schedule" | null;
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
          <p className="font-mono text-xs tracking-[0.18em] text-background/65">
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
        crossOrigin="use-credentials"
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

  const stages = [
    ["queued", "Queued"],
    ["researching", "Research"],
    ["verifying", "Verify"],
    ["writing", "Write"],
    ["synthesizing", "Audio"],
  ] as const;
  const activeStage = stages.findIndex(([stage]) => stage === podcast.status);

  return (
    <div className="mt-5" aria-label={`Generation progress: ${getStatusLabel(podcast)}`}>
      <progress
        aria-label={`${getStatusLabel(podcast)}: ${podcast.progress}%`}
        className="h-1 w-full accent-foreground"
        max="100"
        value={podcast.progress}
      />
      <ol className="mt-3 grid grid-cols-5 gap-1" aria-hidden="true">
        {stages.map(([stage, label], index) => {
          const isActive = index === activeStage;
          const isComplete = index < activeStage;
          return (
            <li className="min-w-0" key={stage}>
              <span
                className={
                  isActive
                    ? "block h-1.5 overflow-hidden rounded-full bg-[length:200%_100%] bg-[linear-gradient(110deg,var(--foreground)_20%,var(--muted)_45%,var(--foreground)_70%)] animate-[yappa-shimmer_1.4s_linear_infinite] motion-reduce:animate-none"
                    : isComplete
                      ? "block h-1.5 rounded-full bg-foreground"
                      : "block h-1.5 rounded-full bg-border"
                }
              />
              <span className="mt-1 block truncate font-mono text-[10px] text-muted-foreground">
                {label}
              </span>
            </li>
          );
        })}
      </ol>
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
        <div className="grid gap-4 sm:grid-cols-2">
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
  const [request, setRequest] = useState<RequestState>({ status: "idle" });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [quota, setQuota] = useState<GenerationQuota | null>(null);
  const [quotaError, setQuotaError] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState("1");
  const [composerOpen, setComposerOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
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
        const response = await apiFetch("/podcasts");
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

    void refreshPodcasts();
    const interval = window.setInterval(refreshPodcasts, 3_000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadQuota() {
      try {
        const response = await apiFetch("/generation-quota");
        const body = (await readApiJson(response)) as GenerationQuota | { error: string };
        if (!response.ok || !("remaining" in body)) {
          throw new Error("Generation allowance could not be loaded.");
        }
        if (mounted) {
          setQuota(body);
          setQuotaError(false);
        }
      } catch {
        if (mounted) setQuotaError(true);
      }
    }

    void loadQuota();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const topic = String(formData.get("topic") ?? "").trim();
    const selectedDurationMinutes = Number(durationMinutes);
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const shouldSchedule = submitter?.value === "schedule";
    const scheduledFor = shouldSchedule
      ? new Date(String(formData.get("scheduledFor") ?? ""))
      : null;

    if (!shouldSchedule && topic.length < 8) {
      setRequest({
        status: "error",
        message: "Describe the debate in at least 8 characters.",
        field: "topic",
      });
      return;
    }
    if (shouldSchedule && topic.length > 0 && topic.length < 8) {
      setRequest({
        status: "error",
        message: "Describe the debate in at least 8 characters, or leave it blank to use an interest.",
        field: "topic",
      });
      return;
    }
    if (
      shouldSchedule &&
      (!scheduledFor || Number.isNaN(scheduledFor.getTime()) || scheduledFor <= new Date())
    ) {
      setRequest({
        status: "error",
        message: "Choose a time in the future.",
        field: "schedule",
      });
      return;
    }

    setRequest({ status: "submitting" });

    try {
      const response = await apiFetch("/podcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(topic ? { topic } : {}),
          durationMinutes: selectedDurationMinutes,
          scheduledFor: scheduledFor?.toISOString(),
          maxIterations: 2,
        }),
      });
      const body = (await readApiJson(response)) as
        | CreatedPodcast
        | { error: string; quota?: GenerationQuota };

      if (!response.ok) {
        if ("quota" in body && body.quota) setQuota(body.quota);
        throw new Error(
          "error" in body && typeof body.error === "string"
            ? body.error
            : "Podcast could not be scheduled.",
        );
      }

      const created = body as CreatedPodcast;
      setPodcasts((current) => [created, ...current]);
      setQuota(created.quota);
      setRequest({ status: "idle" });
      setComposerOpen(false);
      setScheduleOpen(false);
      form.reset();
      setDurationMinutes("1");
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
      const response = await apiFetch(`/podcasts/${podcast.id}/retry`, {
        method: "POST",
      });
      const body = (await readApiJson(response)) as Podcast | { error: string };
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

  function toggleSchedule() {
    setRequest({ status: "idle" });
    if (!scheduleOpen) {
      const now = new Date();
      setScheduleDefaults({
        min: toLocalDateTimeInput(now),
        value: toLocalDateTimeInput(new Date(now.getTime() + 60 * 60_000)),
      });
    }
    setScheduleOpen((open) => !open);
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="sr-only">Yappa.ai home</h1>

      <div className="mb-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
        <p className="text-sm text-muted-foreground" id="generation-quota-summary" role="status">
          {quota
            ? quota.unlimited
              ? "Unlimited generations"
              : quota.remaining === 0
              ? "All 3 free generations used"
              : `${quota.remaining} of ${quota.limit} free generations left`
            : quotaError
              ? "Your free limit will be checked when you create"
              : "Checking free generations…"}
        </p>
        <Dialog
          open={composerOpen}
          onOpenChange={(open) => {
            setComposerOpen(open);
            if (!open) {
              setRequest({ status: "idle" });
              setScheduleOpen(false);
            }
          }}
        >
          <DialogTrigger
            render={
              <Button
                aria-describedby="generation-quota-summary"
                className="h-11 w-full gap-2 px-4 sm:w-auto"
                disabled={quota?.remaining === 0}
                type="button"
              >
                <Plus aria-hidden="true" />
                New podcast
              </Button>
            }
          />
          <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-mono text-2xl tracking-[-0.04em]">
                New podcast
              </DialogTitle>
              <DialogDescription>
                Pick a question. We’ll build a two-sided podcast around it.
              </DialogDescription>
            </DialogHeader>

            <form className="mt-2" onSubmit={handleCreate}>
              <Label className="sr-only" htmlFor="podcast-topic">
                Podcast topic
              </Label>
              <Input
                aria-describedby={
                  request.status === "error" && request.field === "topic"
                    ? "topic-error"
                    : undefined
                }
                aria-invalid={request.status === "error" && request.field === "topic"}
                className="h-14 rounded-md px-4 text-base md:text-lg"
                id="podcast-topic"
                maxLength={240}
                name="topic"
                placeholder="For example: SSR versus CSR for a growing SaaS product"
                required={!scheduleOpen}
              />
              {request.status === "error" && request.field === "topic" ? (
                <p className="mt-3 text-sm text-destructive" id="topic-error" role="alert">
                  {request.message}
                </p>
              ) : null}

              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <Label htmlFor="duration-minutes">Episode length</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <Clock3 aria-hidden="true" className="size-4 text-muted-foreground" />
                    <Select
                      name="durationMinutes"
                      onValueChange={(value) => setDurationMinutes(value ?? "1")}
                      value={durationMinutes}
                    >
                      <SelectTrigger className="h-11 min-w-36" id="duration-minutes">
                        <SelectValue>{`${durationMinutes} ${durationMinutes === "1" ? "minute" : "minutes"}`}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 minute</SelectItem>
                        <SelectItem value="3">3 minutes</SelectItem>
                        <SelectItem value="5">5 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    className="h-11 px-4"
                    disabled={request.status === "submitting"}
                    name="action"
                    type="submit"
                    value="now"
                  >
                    {request.status === "submitting" && !scheduleOpen ? (
                      <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                    ) : null}
                    Create now
                  </Button>
                  <Button
                    aria-expanded={scheduleOpen}
                    className="h-11 px-4"
                    onClick={toggleSchedule}
                    type="button"
                    variant="outline"
                  >
                    Schedule later
                  </Button>
                </div>
              </div>

              {scheduleOpen ? (
                <div className="mt-6 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-end">
                  <div className="max-w-sm flex-1">
                    <Label htmlFor="scheduled-for">Have it ready by</Label>
                    <Input
                      aria-describedby={
                        request.status === "error" && request.field === "schedule"
                          ? "schedule-error"
                          : undefined
                      }
                      aria-invalid={request.status === "error" && request.field === "schedule"}
                      className="mt-2 h-11 px-3 text-base md:text-base"
                      defaultValue={scheduleDefaults.value}
                      id="scheduled-for"
                      min={scheduleDefaults.min}
                      name="scheduledFor"
                      required
                      type="datetime-local"
                    />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Leave the topic blank to use your most recently saved interest.
                    </p>
                  </div>
                  <Button
                    className="h-11 px-4"
                    disabled={request.status === "submitting"}
                    name="action"
                    type="submit"
                    value="schedule"
                  >
                    {request.status === "submitting" ? (
                      <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                    ) : null}
                    Schedule podcast
                  </Button>
                  {request.status === "error" && request.field === "schedule" ? (
                    <p className="text-sm text-destructive sm:pb-3" id="schedule-error" role="alert">
                      {request.message}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {actionError ? (
                <p className="mt-4 text-sm text-destructive" role="alert">
                  {actionError}
                </p>
              ) : null}
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {readyPodcast ? (
        <ReadyPodcastHero key={readyPodcast.id} podcast={readyPodcast} />
      ) : null}

      <div className={readyPodcast ? "mt-6" : ""}>
        <NextPodcastStatus podcast={nextPodcast} />
      </div>

      {loadError ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : null}

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
