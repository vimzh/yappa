"use client";

// Sticky landing-page navigation with a scroll-aware separation rule.
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/auth-dialog";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";

function AuthAction() {
  const [signedIn, setSignedIn] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    let active = true;

    void apiFetch("/auth/me")
      .then((response) => {
        if (active) setSignedIn(response.ok);
      })
      .catch(() => {
        if (active) setSignedIn(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      {signedIn ? (
        <Button
          className="min-h-11 px-3 sm:px-5"
          nativeButton={false}
          render={<Link href="/home" />}
        >
          Home
        </Button>
      ) : (
        <Button
          aria-haspopup="dialog"
          className="min-h-11 px-3 sm:px-5"
          onClick={() => setAuthOpen(true)}
        >
          Login
        </Button>
      )}
      {authOpen ? (
        <AuthDialog
          onOpenChange={setAuthOpen}
          open={authOpen}
          reason="required"
        />
      ) : null}
    </>
  );
}

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
      className={`sticky top-0 z-40 -mx-5 w-[calc(100%+2.5rem)] bg-background pt-[env(safe-area-inset-top)] after:absolute after:left-1/2 after:top-full after:w-screen after:-translate-x-1/2 after:border-b after:content-[''] sm:-mx-8 sm:w-[calc(100%+4rem)] ${
        scrolled ? "after:border-border" : "after:border-transparent"
      }`}
    >
      <div className="relative mx-auto flex min-h-16 w-full max-w-5xl items-center justify-between px-5 sm:px-8 lg:px-0">
        <Link
          aria-label="Yappa.ai home"
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
          Yappa.ai
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-3 text-sm text-muted-foreground sm:absolute sm:left-1/2 sm:flex sm:-translate-x-1/2 sm:gap-6 sm:text-base"
        >
          <a className="flex min-h-11 items-center hover:text-foreground" href="https://github.com">
            GitHub
          </a>
          <Link className="flex min-h-11 items-center hover:text-foreground" href="/#use-cases">
            Use cases
          </Link>
          <Link className="flex min-h-11 items-center hover:text-foreground" href="/#philosophy">
            Philosophy
          </Link>
          {/* <Link className="flex min-h-11 items-center hover:text-foreground" href="/pricing">
            Pricing
          </Link> */}
        </nav>

        <AuthAction />
      </div>
    </header>
  );
}
