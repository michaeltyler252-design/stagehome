import type { Metadata } from "next";
import { canonicalUrl } from "../../lib/seo";

export const metadata: Metadata = {
  title: "How verification works",
  description: "How StageHome verifies every student housing listing before publishing it.",
  alternates: { canonical: canonicalUrl("/how-it-works") },
};

const STEPS = [
  {
    title: "Submission",
    body: "A property enters StageHome either because a manager lists it directly, or because our research team sourced it from public listings. Either way, it starts unverified and invisible to renters.",
  },
  {
    title: "Documentary check",
    body: "We cross-check the university and campus against Kenya's Commission for University Education register, and recalculate distance and travel time through a maps service rather than trusting a supplied estimate.",
  },
  {
    title: "Contact confirmation",
    body: "We call the listed manager to confirm the property exists, is available, and matches its description \u2014 price, deposit, and unit availability included.",
  },
  {
    title: "Publication",
    body: "Only once a property clears every check does it carry the verified stamp and appear in search results. Anything flagged as a data conflict is held back until a person resolves it.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="route-headline text-4xl">How verification works</h1>
      <p className="mt-3 text-chalk/70">
        StageHome would rather show you fewer listings than show you one that
        turns out not to exist. Here&apos;s exactly what happens before anything
        reaches search.
      </p>

      <ol className="mt-8 space-y-6">
        {STEPS.map((step, index) => (
          <li key={step.title} className="ticket-card p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-chalk/50">
              Step {index + 1}
            </p>
            <h2 className="mt-1 font-display text-xl">{step.title}</h2>
            <p className="mt-2 text-sm text-chalk/80">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
