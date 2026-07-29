import type { Metadata } from "next";
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

  const search = await apiClient
    .searchProperties({ countySlug: params.countySlug, limit: 12 })
    .catch(() => ({ results: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 1 } }));

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
        {search.pagination.total} verified {search.pagination.total === 1 ? "listing" : "listings"} live
        right now.
      </p>

      {search.results.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No verified listings yet in this county"
            description="Properties here are still moving through source-data verification. Once approved, they'll appear on this page automatically."
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {search.results.map((property: any) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
