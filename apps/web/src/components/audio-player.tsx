"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  className,
  src,
  title,
}: {
  className?: string;
  src: string;
  title: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      document
        .querySelectorAll("audio")
        .forEach((other) => other !== audio && other.pause());
      try {
        await audio.play();
      } catch {
        setFailed(true);
      }
    } else {
      audio.pause();
    }
  }

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime(value);
  }

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-lg bg-muted/60 px-2 py-1.5",
        className,
      )}
    >
      <Button
        aria-label={playing ? `Pause ${title}` : `Play ${title}`}
        className="size-11 shrink-0 rounded-full"
        onClick={togglePlayback}
        size="icon"
        type="button"
      >
        {playing ? (
          <Pause aria-hidden="true" />
        ) : (
          <Play aria-hidden="true" className="translate-x-px" />
        )}
      </Button>

      <div className="min-w-0 flex-1">
        <div className="relative h-11 rounded-sm has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-offset-2">
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-foreground"
              style={{ width: `${progress}%` }}
            />
          </div>
          <input
            aria-label={`Seek ${title}`}
            className="absolute inset-0 h-11 w-full cursor-pointer appearance-none bg-transparent outline-none [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-foreground [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground"
            max={duration || 1}
            min="0"
            onInput={(event) => seek(event.currentTarget.valueAsNumber)}
            step="0.1"
            type="range"
            value={currentTime}
          />
        </div>
        <p
          aria-live="polite"
          className={cn(
            "-mt-1 font-mono text-[11px] tabular-nums text-muted-foreground",
            failed && "text-destructive",
          )}
        >
          {failed
            ? "Audio unavailable"
            : `${formatTime(currentTime)} / ${formatTime(duration)}`}
        </p>
      </div>

      <audio
        onLoadedMetadata={() => setFailed(false)}
        onDurationChange={(event) =>
          setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)
        }
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => setFailed(true)}
        onPause={() => setPlaying(false)}
        onPlay={() => {
          setFailed(false);
          setPlaying(true);
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        preload="metadata"
        ref={audioRef}
        src={src}
      />
    </div>
  );
}
