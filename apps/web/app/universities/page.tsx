import type { Metadata } from "next";
import Link from "next/link";
import { apiClient } from "../../lib/api-client";
import { EmptyState } from "../../components/EmptyState";
import { canonicalUrl } from "../../lib/seo";

export const metadata: Metadata = {
  title: "Browse student housing by university",
  description: "Find verified accommodation near your campus.",
  alternates: { canonical: canonicalUrl("/universities") },
};

export default async function UniversitiesPage() {
  const universities = await apiClient.listUniversities().catch(() => []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="route-headline text-4xl">Universities</h1>
      <p className="mt-2 max-w-xl text-chalk/70">
        Each university page lists nearby estates, walking and driving
        distance, and every verified listing within reach of campus.
      </p>

      {universities.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No universities loaded yet"
            description="Institution pages are added once each university is confirmed against the Commission for University Education register."
          />
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {universities.map((u) => (
            <li key={u.slug}>
              <Link href={`/universities/${u.slug}`} className="ticket-card block p-5 hover:shadow-md">
                <p className="font-display text-lg leading-snug">{u.officialName}</p>
                <p className="mt-2 font-mono text-xs uppercase tracking-widest text-chalk/50">
                  {u.verificationStatus === "VERIFIED" ? "Verified institution" : "Verification pending"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
