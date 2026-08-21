"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await apiFetch("/auth/logout", { method: "POST" });
    router.replace("/");
  }

  return <Button className="w-full justify-start" onClick={signOut} type="button" variant="ghost">Sign out</Button>;
}
