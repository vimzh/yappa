import Link from "next/link";

import { GoogleSignIn } from "@/components/google-sign-in";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/35 px-5 py-10">
      <section aria-labelledby="sign-in-heading" className="w-full max-w-[24rem] rounded-xl border bg-background p-7 shadow-sm sm:p-8">
        <Link className="font-mono text-lg tracking-[-0.04em]" href="/">Yappa</Link>
        <h1 className="mt-12 font-mono text-3xl tracking-[-0.05em]" id="sign-in-heading">Continue learning.</h1>
        <p className="mt-3 text-muted-foreground">Sign in to keep your debates, recordings, and costs private.</p>
        {error ? <p className="mt-5 text-sm text-destructive" role="alert">Google sign-in did not complete. Try again.</p> : null}
        <div className="mt-8"><GoogleSignIn /></div>
        <p className="mt-6 text-xs leading-5 text-muted-foreground">Yappa only uses your Google identity to create your account. It does not access your Google Drive, mail, or calendar.</p>
      </section>
    </main>
  );
}
