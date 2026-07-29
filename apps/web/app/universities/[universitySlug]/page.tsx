import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiClient } from "../../../lib/api-client";
import { EmptyState } from "../../../components/EmptyState";
import { PropertyCard } from "../../../components/PropertyCard";
import { JsonLd } from "../../../components/JsonLd";
import { canonicalUrl, breadcrumbJsonLd } from "../../../lib/seo";

interface Props {
  params: { universitySlug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const university = await apiClient.getUniversity(params.universitySlug);
    return {
      title: `Student housing near ${university.officialName}`,
      description: `Verified accommodation near ${university.officialName}, ${university.county?.name ?? "Kenya"}.`,
      alternates: { canonical: canonicalUrl(`/universities/${params.universitySlug}`) },
      openGraph: {
        title: `Student housing near ${university.officialName}`,
        description: `Verified accommodation near ${university.officialName}, ${university.county?.name ?? "Kenya"}.`,
      },
    };
  } catch {
    return { title: "University not found" };
  }
}

export default async function UniversityDetailPage({ params }: Props) {
  const university = await apiClient.getUniversity(params.universitySlug).catch(() => null);
  if (!university) {
    notFound();
  }

  const search = await apiClient
    .searchProperties({ universitySlug: params.universitySlug, limit: 12 })
    .catch(() => ({ results: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 1 } }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Universities", path: "/universities" },
          { name: university.officialName, path: `/universities/${params.universitySlug}` },
        ])}
      />
      <p className="font-mono text-xs uppercase tracking-widest text-chalk/50">
        {university.county?.name ?? "Verification Required"}
      </p>
      <h1 className="route-headline text-4xl">{university.officialName}</h1>

      {university.campuses?.length ? (
        <p className="mt-2 text-chalk/70">
          Campuses: {university.campuses.map((c: any) => c.name).join(", ")}
        </p>
      ) : null}

      <p className="mt-2 text-chalk/70">
        {search.pagination.total} verified {search.pagination.total === 1 ? "listing" : "listings"} near
        this university.
      </p>

      {search.results.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No verified listings near this university yet"
            description="Distance and campus data for this institution is still being confirmed via a maps service, per our verification workflow."
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
