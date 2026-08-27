import { notFound } from "next/navigation";

// import { FooterBar } from "@/components/footer-bar";
// import { LandingHeader } from "@/components/landing-header";
// import { PricingCards } from "@/components/pricing-section";

export default function PricingPage() {
  notFound();
}

/* Pricing is temporarily hidden while plans are being finalized.
function PricingPageContent() {
  return (
    <div className="flex min-h-svh flex-col px-5 sm:px-8">
      <LandingHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 py-20 sm:py-28">
        <section aria-labelledby="pricing-heading">
          <div className="max-w-2xl">
            <p className="font-mono text-xs text-muted-foreground">Plans</p>
            <h1
              className="mt-4 text-balance font-mono text-4xl leading-tight tracking-[-0.04em] sm:text-6xl"
              id="pricing-heading"
            >
              A clear place to start.
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Yappa.ai is free while we learn what makes debate-based listening most useful.
            </p>
          </div>

          <div className="mt-12">
            <PricingCards />
          </div>
        </section>
      </main>

      <FooterBar />
    </div>
  );
}
*/
