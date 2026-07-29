import Link from "next/link";
import type { Metadata } from "next";
import { HeroSearchBar } from "../components/HeroSearchBar";
import { apiClient } from "../lib/api-client";
import { canonicalUrl } from "../lib/seo";

export const metadata: Metadata = {
  alternates: { canonical: canonicalUrl("/") },
};

export default async function HomePage() {
  const [counties, universities] = await Promise.all([
    apiClient.listCounties().catch(() => []),
    apiClient.listUniversities().catch(() => []),
  ]);

  return (
    <>
      <section className="border-b-2 border-chalk bg-stage/20">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <p className="font-mono text-sm uppercase tracking-widest text-murram">
            Phase 1 &middot; Nairobi City
          </p>
          <h1 className="route-headline mt-3 text-5xl sm:text-7xl">
            Every stage,
            <br />
            verified before you board.
          </h1>
          <p className="mt-4 max-w-lg font-body text-lg text-chalk/80">
            StageHome maps student housing the way you already navigate the
            city: by campus, by estate, by route. Nothing reaches this page
            until a real person has confirmed it exists.
          </p>
          <div className="mt-8">
            <HeroSearchBar />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl uppercase">Browse by county</h2>
          <Link href="/counties" className="font-mono text-sm text-murram hover:underline">
            All counties &rarr;
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {counties.length === 0 ? (
            <p className="font-body text-sm text-chalk/60">
              County listings are loading in from the verification pipeline —
              check back shortly.
            </p>
          ) : (
            counties.map((county) => (
              <Link
                key={county.slug}
                href={`/counties/${county.slug}`}
                className="fare-badge bg-navy hover:bg-murram transition-colors"
              >
                {county.name}
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl uppercase">Popular universities</h2>
          <Link href="/universities" className="font-mono text-sm text-murram hover:underline">
            All universities &rarr;
          </Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {universities.length === 0 ? (
            <p className="font-body text-sm text-chalk/60">
              University pages go live once each institution is confirmed
              against the CUE register.
            </p>
          ) : (
            universities.slice(0, 9).map((u) => (
              <Link
                key={u.slug}
                href={`/universities/${u.slug}`}
                className="ticket-card p-4 hover:shadow-md"
              >
                <p className="font-display text-base">{u.officialName}</p>
                <p className="mt-1 font-mono text-xs uppercase text-chalk/50">
                  {u.verificationStatus === "VERIFIED" ? "Verified institution" : "Verification pending"}
                </p>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="border-t-2 border-chalk bg-navy py-14 text-paper">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-2xl uppercase">How verification works</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <div>
              <p className="verified-stamp bg-paper">Step 1</p>
              <p className="mt-2 font-body text-sm text-paper/80">
                A property is submitted by its manager or sourced from public
                listings — every field starts unverified.
              </p>
            </div>
            <div>
              <p className="verified-stamp bg-paper">Step 2</p>
              <p className="mt-2 font-body text-sm text-paper/80">
                Our team documents, calls, or visits to confirm the property,
                its price, and its distance to campus.
              </p>
            </div>
            <div>
              <p className="verified-stamp bg-paper">Step 3</p>
              <p className="mt-2 font-body text-sm text-paper/80">
                Only then does it carry the verified stamp and appear in
                search results.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
