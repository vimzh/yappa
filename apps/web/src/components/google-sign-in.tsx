"use client";

import { buttonVariants } from "@/components/ui/button";
import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

export function GoogleSignIn() {
  return <a className={cn(buttonVariants(), "w-full")} href={`${apiUrl}/auth/google`}>Continue with Google</a>;
}
