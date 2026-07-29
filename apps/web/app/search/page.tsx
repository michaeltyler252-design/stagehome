import type { Metadata } from "next";
import { SearchFilters } from "../../components/SearchFilters";
import { PropertyCard } from "../../components/PropertyCard";
import { EmptyState } from "../../components/EmptyState";
import { apiClient } from "../../lib/api-client";

export const metadata: Metadata = {
  title: "Search verified student housing",
  robots: { index: false }, // Part L: noindex thin/parameterised search pages
};

interface Props {
  searchParams: Record<string, string | undefined>;
}

export default async function SearchPage({ searchParams }: Props) {
  const page = searchParams.page ? Number(searchParams.page) : 1;

  const search = await apiClient
    .searchProperties({
      keyword: searchParams.keyword,
      categoryKey: searchParams.categoryKey,
      countySlug: searchParams.countySlug,
      universitySlug: searchParams.universitySlug,
      minRent: searchParams.minRent,
      maxRent: searchParams.maxRent,
      sort: searchParams.sort,
      page,
      limit: 12,
    })
    .catch(() => ({ results: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 1 } }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="route-headline text-4xl">Search</h1>
      <div className="mt-6">
        <SearchFilters />
      </div>

      <p className="mt-6 font-mono text-sm text-chalk/60">
        {search.pagination.total} {search.pagination.total === 1 ? "result" : "results"}
      </p>

      {search.results.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No verified listings match yet"
            description="Try widening your rent range or clearing a filter. New listings appear here the moment they pass verification — nothing is hidden from you once it's ready."
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {search.results.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
