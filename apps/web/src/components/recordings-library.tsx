"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AudioPlayer } from "@/components/audio-player";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3101";

type Podcast = {
  id: string;
  topic: string;
  title: string;
  qualityScore: number | null;
  hasAudio: boolean;
  createdAt: string;
};

export function RecordingsLibrary() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      try {
        const response = await fetch(`${apiUrl}/podcasts`);
        if (!response.ok) throw new Error(`API returned ${response.status}.`);
        const data = (await response.json()) as Podcast[];
        if (mounted) {
          setPodcasts(data);
          setLoaded(true);
          setError(null);
        }
      } catch {
        if (mounted) {
          setLoaded(true);
          setError("Couldn’t load recordings. Retrying automatically.");
        }
      }
    }

    void refresh();
    const interval = window.setInterval(refresh, 3_000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const recordings = podcasts.filter((podcast) => podcast.hasAudio);

  return (
    <section aria-labelledby="recordings-heading" className="mx-auto w-full max-w-5xl">
      <div className="max-w-2xl">
        <h1
          className="text-balance font-mono text-3xl leading-tight tracking-[-0.03em] sm:text-4xl"
          id="recordings-heading"
        >
          Recordings
        </h1>
        <p className="mt-3 text-pretty text-lg text-muted-foreground">
          Your finished debates, ready to play whenever you are.
        </p>
      </div>

      {!loaded ? (
        <p aria-live="polite" className="mt-12 text-muted-foreground">
          Loading recordings…
        </p>
      ) : null}

      {error ? (
        <p className="mt-8 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loaded && recordings.length === 0 ? (
        <div className="mt-12 border-y py-10">
          <h2 className="font-mono text-xl">No recordings yet.</h2>
          <p className="mt-2 text-muted-foreground">
            Generate a debate and its finished audio will appear here.
          </p>
          <Link
            className="mt-5 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            href="/home"
          >
            Create a podcast
          </Link>
        </div>
      ) : null}

      {recordings.length > 0 ? (
        <div className="mt-10 divide-y border-y">
          {recordings.map((recording) => (
            <article
              className="grid gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_6rem_20rem] lg:items-center"
              key={recording.id}
            >
              <div className="min-w-0">
                <h2 className="text-lg font-medium">
                  <Link
                    className="underline decoration-transparent underline-offset-4 transition-colors hover:decoration-foreground"
                    href={`/podcasts/${recording.id}`}
                  >
                    {recording.title}
                  </Link>
                </h2>
                <p className="mt-1 line-clamp-2 text-muted-foreground">
                  {recording.topic}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Recorded {new Date(recording.createdAt).toLocaleDateString("en", { dateStyle: "medium" })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Quality</p>
                <p className="mt-1 font-mono text-sm tabular-nums">
                  {recording.qualityScore === null
                    ? "Pending"
                    : `${recording.qualityScore}/100`}
                </p>
              </div>
              <AudioPlayer
                src={`${apiUrl}/podcasts/${recording.id}/audio`}
                title={recording.title}
              />
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
