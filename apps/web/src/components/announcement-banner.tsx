"use client";

// Dismissible hackathon announcement with a focused challenge link.
import { useState } from "react";

const challengeUrl =
  "https://proof-of-possible-2026.devpost.com/?ref_content=online-hackathons&ref_feature=challenge&ref_medium=artificial-intelligence-channel";

export function AnnouncementBanner() {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div className="relative -mx-5 flex min-h-10 items-center justify-center bg-neutral-800 px-12 py-2 text-center font-mono text-xs text-white sm:-mx-8">
      <a
        className="underline-offset-4 transition-colors hover:text-white/75 hover:underline"
        href={challengeUrl}
        rel="noreferrer"
        target="_blank"
      >
        Built for Proof of Possible 2026 <span className="text-white/60">↗</span>
      </a>
      <button
        aria-label="Close hackathon banner"
        className="absolute right-3 flex size-8 items-center justify-center text-lg leading-none text-white/70 transition-colors hover:text-white sm:right-5"
        onClick={() => setOpen(false)}
        type="button"
      >
        ×
      </button>
    </div>
  );
}
