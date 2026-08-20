"use client";

// Sticky landing-page navigation with a scroll-aware separation rule.
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import Link from "next/link";

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateScrollState = () => setScrolled(window.scrollY > 0);

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 mx-auto w-full max-w-5xl bg-background/95 backdrop-blur-sm after:absolute after:left-1/2 after:top-full after:w-screen after:-translate-x-1/2 after:border-b after:content-[''] ${
        scrolled ? "after:border-border" : "after:border-transparent"
      }`}
    >
      <div className="relative flex min-h-16 items-center justify-between">
        <Link
          aria-label="Yappa home"
          className="flex min-h-11 items-center gap-2 font-mono text-sm font-medium tracking-[-0.02em]"
          href="/"
        >
          <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
            <path
              d="m5 4 7 8 7-8M12 12v8"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
          Yappa
        </Link>

        <nav
          aria-label="Primary navigation"
          className="absolute left-1/2 flex -translate-x-1/2 items-center gap-3 text-sm text-muted-foreground sm:gap-6 sm:text-base"
        >
          <a className="flex min-h-11 items-center hover:text-foreground" href="https://github.com">
            GitHub
          </a>
          <a className="flex min-h-11 items-center hover:text-foreground" href="#use-cases">
            Use cases
          </a>
          <a className="flex min-h-11 items-center hover:text-foreground" href="#philosophy">
            Philosophy
          </a>
        </nav>

        <Button
          className="min-h-11 px-3 sm:px-5"
          nativeButton={false}
          render={<a href="#start" />}
        >
          Try now
        </Button>
      </div>
    </header>
  );
}
