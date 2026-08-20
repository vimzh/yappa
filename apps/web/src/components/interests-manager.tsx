"use client";

import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3101";

type Interest = {
  id: string;
  topic: string;
  createdAt: string;
};

export function InterestsManager() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadInterests() {
      try {
        const response = await fetch(`${apiUrl}/interests`);
        if (!response.ok) throw new Error();
        const data = (await response.json()) as Interest[];
        if (mounted) {
          setInterests(data);
          setError(null);
        }
      } catch {
        if (mounted) setError("Couldn’t load interests. Check that the API is running.");
      } finally {
        if (mounted) setLoaded(true);
      }
    }

    void loadInterests();
    return () => {
      mounted = false;
    };
  }, []);

  async function addInterest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const topic = String(new FormData(form).get("topic") ?? "").trim();

    if (topic.length < 2) {
      setError("Enter an interest with at least 2 characters.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/interests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const body = (await response.json()) as Interest | { error: string };
      if (!response.ok) {
        throw new Error("error" in body ? body.error : "Interest could not be saved.");
      }

      setInterests((current) => [...current, body as Interest]);
      form.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Interest could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteInterest(interest: Interest) {
    setDeletingId(interest.id);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/interests/${interest.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Interest could not be removed.");
      setInterests((current) => current.filter((item) => item.id !== interest.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Interest could not be removed.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Your learning map
        </p>
        <h1 className="mt-3 font-mono text-3xl tracking-[-0.04em] sm:text-4xl">
          Interests
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Save the topics you want Yappa to turn into future debates.
        </p>
      </header>

      <form className="mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-end" onSubmit={addInterest}>
        <div className="flex-1">
          <Label htmlFor="interest-topic">Topic</Label>
          <Input
            aria-describedby={error ? "interest-error" : undefined}
            aria-invalid={Boolean(error)}
            autoComplete="off"
            className="mt-2 h-11 px-4 text-base md:text-base"
            id="interest-topic"
            maxLength={80}
            name="topic"
            placeholder="e.g. Nuclear energy"
          />
        </div>
        <Button className="h-11 px-4" disabled={submitting} type="submit">
          {submitting ? (
            <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          Add interest
        </Button>
      </form>

      {error ? (
        <p className="mt-3 text-sm text-destructive" id="interest-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mt-12" aria-labelledby="saved-interests-heading">
        <div className="flex items-baseline justify-between border-b pb-3">
          <h2 className="font-mono text-xl tracking-[-0.03em]" id="saved-interests-heading">
            Saved topics
          </h2>
          <span className="text-sm tabular-nums text-muted-foreground">
            {interests.length}
          </span>
        </div>

        {!loaded ? (
          <p className="py-8 text-sm text-muted-foreground" role="status">
            Loading interests…
          </p>
        ) : interests.length === 0 ? (
          <div className="py-10">
            <p className="font-medium">No interests saved yet.</p>
            <p className="mt-2 text-muted-foreground">
              Add a topic above, then choose it when you schedule a podcast.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {interests.map((interest) => (
              <li className="flex min-h-16 items-center justify-between gap-4 py-3" key={interest.id}>
                <span className="text-lg">{interest.topic}</span>
                <Button
                  aria-label={`Remove ${interest.topic}`}
                  className="size-11"
                  disabled={deletingId === interest.id}
                  onClick={() => deleteInterest(interest)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  {deletingId === interest.id ? (
                    <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Trash2 aria-hidden="true" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
