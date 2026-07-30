import type { Metadata } from "next";
import Link from "next/link";
import { apiClient } from "../../lib/api-client";
import { EmptyState } from "../../components/EmptyState";
import { canonicalUrl } from "../../lib/seo";

export const metadata: Metadata = {
  title: "Browse student housing by county",
  description: "Every Kenyan county in StageHome's rollout, in order.",
  alternates: { canonical: canonicalUrl("/counties") },
};

export default async function CountiesPage() {
  const counties = await apiClient.listCounties().catch(() => []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="route-headline text-4xl">Counties</h1>
      <p className="mt-2 max-w-xl text-chalk/70">
        StageHome launches one county at a time, verifying every listing
        before it goes live. Nairobi City is phase 1.
      </p>

      {counties.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No counties loaded yet"
            description="The county directory is seeded from the platform's rollout plan. Check back shortly."
          />
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {counties.map((county) => {
            const hasData = (county.publishedPropertyCount ?? 0) > 0 || (county.verifiedUniversityCount ?? 0) > 0;
            return (
              <li key={county.slug}>
                <Link href={`/counties/${county.slug}`} className="ticket-card block p-5 hover:shadow-md">
                  <p className="font-mono text-xs uppercase tracking-widest text-chalk/50">
                    Phase {county.rolloutPhase ?? "\u2014"}
                  </p>
                  <p className="mt-1 font-display text-xl">{county.name}</p>
                  <p className="mt-2 text-sm text-chalk/60">
                    {hasData
                      ? `${county.publishedPropertyCount ?? 0} listing${county.publishedPropertyCount === 1 ? "" : "s"}, ${county.verifiedUniversityCount ?? 0} verified ${county.verifiedUniversityCount === 1 ? "university" : "universities"}`
                      : "No listings available yet"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
