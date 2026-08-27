"use client";

// Loads and saves the voices and editorial guidance used for new podcasts.
import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";
import { readApiJson } from "@/lib/api-response";
import { apiFetch } from "@/lib/api";

type VoiceOption = { id: string; name: string };
type VoiceSettingsResponse = {
  voiceAId: string;
  voiceBId: string;
  podcastInclude: string;
  podcastAvoid: string;
  options: { voiceA: VoiceOption[]; voiceB: VoiceOption[] };
};

function VoiceGroup({
  legend,
  description,
  name,
  options,
  selected,
  onChange,
}: {
  legend: string;
  description: string;
  name: "voiceAId" | "voiceBId";
  options: VoiceOption[];
  selected: string;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset>
      <legend className="font-mono text-xl tracking-[-0.03em]">{legend}</legend>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-5 space-y-2">
        {options.map((option) => (
          <label
            className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-border px-4 transition-colors hover:bg-muted/60 has-[:checked]:border-foreground has-[:checked]:bg-muted"
            key={option.id}
          >
            <input
              checked={selected === option.id}
              className="size-4 accent-foreground"
              name={name}
              onChange={() => onChange(option.id)}
              type="radio"
              value={option.id}
            />
            <span className="font-medium">{option.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function VoiceSettings() {
  const [settings, setSettings] = useState<VoiceSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const response = await apiFetch("/settings/voices");
        const body = (await readApiJson(response)) as VoiceSettingsResponse | { error: string };
        if (!response.ok || !("options" in body)) {
          throw new Error("error" in body ? body.error : "Settings could not be loaded.");
        }
        if (active) setSettings(body);
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Settings could not be loaded.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  function chooseVoice(key: "voiceAId" | "voiceBId", id: string) {
    setSettings((current) => current && { ...current, [key]: id });
    setMessage(null);
    setError(null);
  }

  function updatePreference(key: "podcastInclude" | "podcastAvoid", value: string) {
    setSettings((current) => current && { ...current, [key]: value });
    setMessage(null);
    setError(null);
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await apiFetch("/settings/voices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceAId: settings.voiceAId,
          voiceBId: settings.voiceBId,
          podcastInclude: settings.podcastInclude,
          podcastAvoid: settings.podcastAvoid,
        }),
      });
      const body = (await readApiJson(response)) as VoiceSettingsResponse | { error: string };
      if (!response.ok || !("options" in body)) {
        throw new Error("error" in body ? body.error : "Settings could not be saved.");
      }
      setSettings(body);
      setMessage("Preferences saved. New podcasts will use these choices.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <header className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Podcast preferences
        </p>
        <h1 className="mt-3 font-mono text-3xl tracking-[-0.04em] sm:text-4xl">Settings</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Choose the voices, coverage, and tone used in new debate podcasts.
        </p>
      </header>

      {loading ? (
        <p className="mt-12 text-sm text-muted-foreground" role="status">
          Loading settings…
        </p>
      ) : settings ? (
        <form
          className="mt-12"
          onKeyDown={(event) => {
            if (
              event.target instanceof HTMLTextAreaElement &&
              (event.metaKey || event.ctrlKey) &&
              event.key === "Enter"
            ) {
              event.currentTarget.requestSubmit();
            }
          }}
          onSubmit={saveSettings}
        >
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
            <VoiceGroup
              description="Maya presents the first side of each debate."
              legend="Voice 1 · Maya"
              name="voiceAId"
              onChange={(voiceAId) => chooseVoice("voiceAId", voiceAId)}
              options={settings.options.voiceA}
              selected={settings.voiceAId}
            />
            <VoiceGroup
              description="Rowan presents the opposing side and responds to Maya."
              legend="Voice 2 · Rowan"
              name="voiceBId"
              onChange={(voiceBId) => chooseVoice("voiceBId", voiceBId)}
              options={settings.options.voiceB}
              selected={settings.voiceBId}
            />
          </div>

          <fieldset className="mt-12 border-t pt-10">
            <legend className="font-mono text-xl tracking-[-0.03em]">Episode guidance</legend>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Add optional guidance for every new podcast. These choices do not replace source verification.
            </p>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <label className="font-medium" htmlFor="podcast-include">What to include</label>
                <p className="mt-1 text-sm text-muted-foreground" id="podcast-include-hint">
                  For example: practical examples, history, and clear definitions.
                </p>
                <textarea
                  aria-describedby="podcast-include-hint"
                  className="mt-3 min-h-32 w-full resize-y rounded-lg border border-input bg-background px-3 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  id="podcast-include"
                  maxLength={1000}
                  name="podcastInclude"
                  onChange={(event) => updatePreference("podcastInclude", event.target.value)}
                  value={settings.podcastInclude}
                />
              </div>
              <div>
                <label className="font-medium" htmlFor="podcast-avoid">What to avoid</label>
                <p className="mt-1 text-sm text-muted-foreground" id="podcast-avoid-hint">
                  For example: dense jargon, graphic detail, or partisan framing.
                </p>
                <textarea
                  aria-describedby="podcast-avoid-hint"
                  className="mt-3 min-h-32 w-full resize-y rounded-lg border border-input bg-background px-3 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  id="podcast-avoid"
                  maxLength={1000}
                  name="podcastAvoid"
                  onChange={(event) => updatePreference("podcastAvoid", event.target.value)}
                  value={settings.podcastAvoid}
                />
              </div>
            </div>
          </fieldset>

          <div className="mt-10 flex flex-wrap items-center gap-4 border-t pt-6">
            <Button className="h-11 px-4" disabled={saving} type="submit">
              {saving ? (
                <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
              ) : (
                <Save aria-hidden="true" />
              )}
              Save preferences
            </Button>
            {message ? (
              <p className="text-sm text-muted-foreground" role="status">{message}</p>
            ) : null}
          </div>
        </form>
      ) : null}

      {error ? (
        <p className="mt-6 text-sm text-destructive" role="alert">{error}</p>
      ) : null}

      <section className="mt-12 border-t pt-6 lg:hidden" aria-labelledby="mobile-account-heading">
        <h2 className="font-mono text-xl" id="mobile-account-heading">Account</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sign out of Yappa.ai on this device.</p>
        <div className="mt-4 max-w-48">
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}
