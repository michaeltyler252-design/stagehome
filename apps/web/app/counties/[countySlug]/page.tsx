import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiClient } from "../../../lib/api-client";
import { EmptyState } from "../../../components/EmptyState";
import { PropertyCard } from "../../../components/PropertyCard";
import { JsonLd } from "../../../components/JsonLd";
import { canonicalUrl, breadcrumbJsonLd } from "../../../lib/seo";

interface Props {
  params: { countySlug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const county = await apiClient.getCounty(params.countySlug);
    return {
      title: `Student housing in ${county.name}`,
      description: `Verified student accommodation listings in ${county.name}, Kenya.`,
      alternates: { canonical: canonicalUrl(`/counties/${params.countySlug}`) },
      openGraph: {
        title: `Student housing in ${county.name}`,
        description: `Verified student accommodation listings in ${county.name}, Kenya.`,
      },
    };
  } catch {
    return { title: "County not found" };
  }
}

export default async function CountyDetailPage({ params }: Props) {
  const county = await apiClient.getCounty(params.countySlug).catch(() => null);
  if (!county) {
    notFound();
  }

  const [search, universities] = await Promise.all([
    apiClient
      .searchProperties({ countySlug: params.countySlug, limit: 12 })
      .catch(() => ({ results: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 1 } })),
    apiClient.listUniversities(params.countySlug).catch(() => []),
  ]);

  const hasNothing = search.results.length === 0 && universities.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Counties", path: "/counties" },
          { name: county.name, path: `/counties/${params.countySlug}` },
        ])}
      />
      <p className="font-mono text-xs uppercase tracking-widest text-chalk/50">
        Phase {county.rolloutPhase ?? "\u2014"}
      </p>
      <h1 className="route-headline text-4xl">{county.name}</h1>
      <p className="mt-2 text-chalk/70">
        {search.pagination.total} verified {search.pagination.total === 1 ? "listing" : "listings"} and{" "}
        {universities.length} verified {universities.length === 1 ? "university" : "universities"} live right
        now.
      </p>

      {hasNothing ? (
        <div className="mt-8">
          <EmptyState
            title="No listings available yet in this county"
            description="Properties and universities here are still moving through source-data verification. Once approved, they'll appear on this page automatically."
          />
        </div>
      ) : (
        <>
          {universities.length > 0 ? (
            <section className="mt-8">
              <h2 className="font-display text-xl">Verified universities</h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {universities.map((u: { slug: string; officialName: string }) => (
                  <li key={u.slug}>
                    <Link href={`/universities/${u.slug}`} className="ticket-card block p-5 hover:shadow-md">
                      <p className="font-display text-lg leading-snug">{u.officialName}</p>
                      <p className="mt-2 font-mono text-xs uppercase tracking-widest text-chalk/50">
                        Verified institution
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {search.results.length > 0 ? (
            <section className="mt-8">
              <h2 className="font-display text-xl">Verified properties</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {search.results.map((property: any) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            </section>
          ) : (
            <div className="mt-8">
              <EmptyState
                title="No verified properties yet in this county"
                description="Properties here are still moving through source-data verification. Once approved, they'll appear on this page automatically."
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
