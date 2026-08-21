"use client";

// Inline Google sign-in dialog shown when a protected action needs auth.
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GoogleSignIn } from "@/components/google-sign-in";
import { useState } from "react";

type AuthReason = "required" | "oauth";

export function AuthDialog({ reason }: { reason: AuthReason }) {
  const [open, setOpen] = useState(true);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Continue learning.</DialogTitle>
          <DialogDescription>
            Sign in to keep your debates, recordings, and interests private.
          </DialogDescription>
        </DialogHeader>

        {reason === "oauth" ? (
          <p className="text-sm text-destructive" role="alert">
            Google sign-in did not complete. Try again.
          </p>
        ) : null}

        <GoogleSignIn />

        <p className="text-xs leading-5 text-muted-foreground">
          Yappa.ai only uses your Google identity to create your account. It does not access your Google Drive, mail, or calendar.
        </p>
      </DialogContent>
    </Dialog>
  );
}
