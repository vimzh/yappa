// Compact footer navigation for the landing page.
import Link from "next/link";

export function FooterBar() {
  return (
    <footer className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-5 border-t border-border py-8">
      <Link
        aria-label="Yappa.ai home"
        className="font-mono text-sm font-medium tracking-[-0.02em]"
        href="/"
      >
        Yappa.ai
      </Link>

      <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
        <a className="hover:text-foreground" href="https://github.com">
          GitHub
        </a>
        <Link className="hover:text-foreground" href="/#use-cases">
          Use cases
        </Link>
        <Link className="hover:text-foreground" href="/#philosophy">
          Philosophy
        </Link>
        <Link className="hover:text-foreground" href="/pricing">
          Pricing
        </Link>
      </nav>
    </footer>
  );
}
