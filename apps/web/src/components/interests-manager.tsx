"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Lightbulb, LoaderCircle, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readApiJson } from "@/lib/api-response";
import { apiFetch } from "@/lib/api";
import { parseInterestTopics } from "@/lib/interests";


type Interest = {
  id: string;
  topic: string;
  createdAt: string;
};

type PodcastTopicSuggestion = {
  title: string;
  learningAngle: string;
};

export function InterestsManager() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PodcastTopicSuggestion[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadInterests() {
      try {
        const response = await apiFetch("/interests");
        if (!response.ok) throw new Error();
        const data = (await response.json()) as Interest[];
        if (mounted) {
          setInterests(data);
          setFormError(null);
        }
      } catch {
        if (mounted) setFormError("Couldn’t load interests. Check that the API is running.");
      } finally {
        if (mounted) setLoaded(true);
      }
    }

    void loadInterests();
    return () => {
      mounted = false;
    };
  }, []);

  async function addInterests(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const topics = parseInterestTopics(String(new FormData(form).get("topics") ?? ""));

    if (topics.length === 0 || topics.some((topic) => topic.length < 2 || topic.length > 80)) {
      setFormError("Enter comma-separated interests between 2 and 80 characters each.");
      return;
    }
    if (topics.length > 20) {
      setFormError("Add up to 20 interests at a time.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setNotice(null);

    try {
      const response = await apiFetch("/interests/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics }),
      });
      const body = (await readApiJson(response)) as Interest[] | { error: string };
      if (!response.ok || !Array.isArray(body)) {
        throw new Error("error" in body ? body.error : "Interest could not be saved.");
      }

      setInterests((current) => [...current, ...body]);
      if (body.length > 0) setSuggestions([]);
      setNotice(
        body.length === 0
          ? "Those interests are already saved."
          : `${body.length} ${body.length === 1 ? "interest" : "interests"} added.`,
      );
      form.reset();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Interests could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteInterest(interest: Interest) {
    setDeletingId(interest.id);
    setFormError(null);

    try {
      const response = await apiFetch(`/interests/${interest.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Interest could not be removed.");
      setInterests((current) => current.filter((item) => item.id !== interest.id));
      setSuggestions([]);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Interest could not be removed.");
    } finally {
      setDeletingId(null);
    }
  }

  async function generateTopics() {
    setGenerating(true);
    setGenerationError(null);

    try {
      const response = await apiFetch("/interests/suggestions", { method: "POST" });
      const body = (await readApiJson(response)) as
        | { topics: PodcastTopicSuggestion[] }
        | { error: string };
      if (!response.ok || !("topics" in body)) {
        throw new Error("error" in body ? body.error : "Podcast topics could not be generated.");
      }
      setSuggestions(body.topics);
    } catch (caught) {
      setGenerationError(
        caught instanceof Error ? caught.message : "Podcast topics could not be generated.",
      );
    } finally {
      setGenerating(false);
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
          Add what you care about, then turn those interests into debate ideas worth hearing.
        </p>
      </header>

      <form className="mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-end" onSubmit={addInterests}>
        <div className="flex-1">
          <Label htmlFor="interest-topics">Interests</Label>
          <p className="mt-1 text-sm text-muted-foreground" id="interest-hint">
            Separate each interest with a comma.
          </p>
          <Input
            aria-describedby={`interest-hint${formError ? " interest-error" : ""}`}
            aria-invalid={Boolean(formError)}
            autoComplete="off"
            className="mt-2 h-11 px-4 text-base md:text-base"
            id="interest-topics"
            maxLength={400}
            name="topics"
            placeholder="Cars, bikes, urban design"
          />
        </div>
        <Button className="h-11 px-4" disabled={submitting} type="submit">
          {submitting ? (
            <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          Add interests
        </Button>
      </form>

      {formError ? (
        <p className="mt-3 text-sm text-destructive" id="interest-error" role="alert">
          {formError}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-3 text-sm text-muted-foreground" role="status">
          {notice}
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

      <section className="mt-16 border-t pt-10" aria-labelledby="podcast-ideas-heading">
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <h2 className="font-mono text-2xl tracking-[-0.03em]" id="podcast-ideas-heading">
              Podcast ideas
            </h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Generate 5 thoughtful debate questions designed to uncover mechanisms, evidence,
              history, and useful trade-offs across your interests.
            </p>
          </div>
          <Button
            className="h-11 px-4"
            disabled={generating || interests.length === 0}
            onClick={generateTopics}
            type="button"
          >
            {generating ? (
              <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Lightbulb aria-hidden="true" />
            )}
            {generating ? "Generating topics…" : "Generate 5 topics"}
          </Button>
        </div>

        {interests.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Add at least one interest to generate ideas.
          </p>
        ) : null}
        {generationError ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {generationError}
          </p>
        ) : null}

        {suggestions.length > 0 ? (
          <ol className="mt-8 divide-y border-y">
            {suggestions.map((suggestion, index) => (
              <li className="grid gap-3 py-6 sm:grid-cols-[2rem_1fr]" key={suggestion.title}>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-xl leading-snug font-medium">{suggestion.title}</h3>
                  <p className="mt-2 max-w-2xl leading-relaxed text-muted-foreground">
                    {suggestion.learningAngle}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </div>
  );
}
