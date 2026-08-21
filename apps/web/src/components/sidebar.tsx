"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headphones, Home, Lightbulb, ReceiptText, Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/sign-out-button";

const items = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Recordings", href: "/recording", icon: Headphones },
  { label: "Interests", href: "/interests", icon: Lightbulb },
  { label: "Costs", href: "/costs", icon: ReceiptText },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const isCurrent = (href: string) =>
    pathname === href || (href === "/recording" && pathname.startsWith("/podcasts/"));

  return (
    <>
      <aside className="sticky top-0 hidden h-svh w-16 shrink-0 self-start flex-col border-r border-border px-2 py-5 sm:flex lg:w-56 lg:px-3">
        <Link
          aria-label="Yappa.ai home"
          className="mb-8 flex min-h-11 items-center justify-center gap-2 px-3 font-mono text-sm font-medium tracking-[-0.02em] lg:justify-start"
          href="/home"
        >
          <svg aria-hidden="true" className="size-5 shrink-0" fill="none" viewBox="0 0 24 24">
            <path
              d="m5 4 7 8 7-8M12 12v8"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
          <span className="hidden lg:inline">Yappa.ai</span>
        </Link>
        <nav aria-label="Primary navigation" className="flex flex-1 flex-col gap-1">
          {items.map(({ label, href, icon: Icon }) => (
            <Link
              aria-current={isCurrent(href) ? "page" : undefined}
              aria-label={label}
              className={cn(
                "flex min-h-11 items-center justify-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:justify-start",
                isCurrent(href) && "bg-muted text-foreground",
              )}
              href={href}
              key={href}
            >
              <Icon aria-hidden="true" className="size-4" />
              <span className="hidden lg:inline">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="hidden px-1 lg:block"><SignOutButton /></div>
      </aside>

      <nav
        aria-label="Primary navigation"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t bg-background/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        {items.map(({ label, href, icon: Icon }) => (
          <Link
            aria-current={isCurrent(href) ? "page" : undefined}
            className={cn(
              "flex min-h-16 min-w-11 flex-col items-center justify-center gap-1 px-1 text-[11px] text-muted-foreground",
              isCurrent(href) && "text-foreground",
            )}
            href={href}
            key={href}
          >
            <Icon aria-hidden="true" className="size-5" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
