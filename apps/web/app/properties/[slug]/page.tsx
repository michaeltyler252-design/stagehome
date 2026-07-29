import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiClient } from "../../../lib/api-client";
import { ReserveButton } from "../../../components/ReserveButton";
import { JsonLd } from "../../../components/JsonLd";
import { canonicalUrl, breadcrumbJsonLd } from "../../../lib/seo";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const property = await apiClient.getProperty(params.slug);
    const description =
      property.description ?? `Verified student housing in ${property.county?.name ?? "Kenya"}.`;
    const image = property.media?.[0]?.storageKey;
    return {
      title: property.title,
      description,
      alternates: { canonical: canonicalUrl(`/properties/${params.slug}`) },
      openGraph: {
        title: property.title,
        description,
        type: "website",
        images: image ? [{ url: image }] : undefined,
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title: property.title,
        description,
      },
    };
  } catch {
    return { title: "Listing not found", robots: { index: false } };
  }
}

export default async function PropertyDetailPage({ params }: Props) {
  const property = await apiClient.getProperty(params.slug).catch(() => null);
  if (!property) {
    notFound();
  }

  const rule = property.pricingRules?.[0];
  const deposit = property.deposits?.[0];

  const reviews: Array<{ overallRating: number | string }> = property.reviews ?? [];
  const averageRating = reviews.length
    ? reviews.reduce((sum, r) => sum + Number(r.overallRating), 0) / reviews.length
    : null;

  // schema.org Accommodation + Offer structured data (Part L SEO requirements).
  // aggregateRating is only included when real reviews exist — Part B rule 9
  // forbids implying verified reviews/ratings that don't exist.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Accommodation",
    name: property.title,
    address: property.address ?? undefined,
    image: property.media?.map((m: any) => m.storageKey) ?? undefined,
    ...(rule
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: rule.currency ?? "KES",
            price: rule.rentAmountMin,
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
    ...(averageRating !== null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: averageRating.toFixed(1),
            reviewCount: reviews.length,
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <JsonLd data={jsonLd} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: property.county?.name ?? "Counties", path: property.county ? `/counties/${property.county.slug}` : "/counties" },
          { name: property.title, path: `/properties/${params.slug}` },
        ])}
      />

      <p className="verified-stamp">Verified &middot; {property.publicReference}</p>
      <h1 className="route-headline mt-3 text-4xl">{property.title}</h1>
      <p className="mt-2 text-chalk/70">
        {property.estate?.name ? `${property.estate.name}, ` : ""}
        {property.town?.name ? `${property.town.name}, ` : ""}
        {property.county?.name}
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        {property.media?.length ? (
          property.media
            .slice(0, 3)
            .map((m: any, i: number) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={m.storageKey}
                alt={m.altText ?? property.title}
                className="aspect-[4/3] w-full rounded-ticket object-cover"
              />
            ))
        ) : (
          <div className="col-span-3 flex aspect-[16/9] items-center justify-center rounded-ticket bg-navy/10 font-mono text-sm text-navy/50">
            Photos pending verification
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-8 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <h2 className="font-display text-xl uppercase">About this place</h2>
          <p className="mt-2 whitespace-pre-line text-chalk/80">
            {property.description ?? "Information Required"}
          </p>

          {property.propertyAmenities?.length ? (
            <>
              <h2 className="mt-8 font-display text-xl uppercase">Amenities</h2>
              <ul className="mt-2 grid grid-cols-2 gap-2 text-sm text-chalk/80">
                {property.propertyAmenities.map((pa: any) => (
                  <li key={pa.amenityId}>{pa.amenity.name}</li>
                ))}
              </ul>
            </>
          ) : null}

          {property.houseRules?.length ? (
            <>
              <h2 className="mt-8 font-display text-xl uppercase">House rules</h2>
              <ul className="mt-2 space-y-1 text-sm text-chalk/80">
                {property.houseRules.map((rule: any) => (
                  <li key={rule.id}>
                    <span className="font-semibold capitalize">{rule.ruleType.replace(/_/g, " ")}:</span>{" "}
                    {rule.detail ?? "Information Required"}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <h2 className="mt-8 font-display text-xl uppercase">
            Reviews {reviews.length ? `(${reviews.length})` : ""}
          </h2>
          {averageRating !== null ? (
            <p className="mt-1 font-mono text-xs uppercase tracking-widest text-chalk/50">
              {averageRating.toFixed(1)} / 5 average, from a verified stay
            </p>
          ) : null}
          {reviews.length === 0 ? (
            <p className="mt-2 text-sm text-chalk/60">
              No reviews yet — reviews appear here once a tenant with a completed, verified booking
              leaves one.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {(property.reviews as any[]).map((review) => (
                <li key={review.id} className="ticket-card p-4">
                  <p className="font-display text-lg">{Number(review.overallRating).toFixed(1)} / 5</p>
                  {review.categories?.length ? (
                    <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-chalk/60">
                      {review.categories.map((c: any) => (
                        <li key={c.id} className="capitalize">
                          {c.category}: {Number(c.rating).toFixed(1)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {review.responses?.length ? (
                    <div className="mt-3 border-l-2 border-chalk/20 pl-3 text-sm text-chalk/70">
                      {review.responses.map((response: any) => (
                        <p key={response.id}>{response.body}</p>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="ticket-card h-fit p-5">
          <p className="font-mono text-xs uppercase tracking-widest text-chalk/50">Monthly rent</p>
          <p className="mt-1 font-display text-2xl">
            {rule
              ? `${rule.currency ?? "KES"} ${Number(rule.rentAmountMin).toLocaleString()}${
                  rule.rentAmountMax ? `\u2013${Number(rule.rentAmountMax).toLocaleString()}` : ""
                }`
              : "Information Required"}
          </p>
          <p className="mt-3 font-mono text-xs uppercase tracking-widest text-chalk/50">Deposit</p>
          <p className="mt-1 font-body">
            {deposit ? deposit.basis ?? `${deposit.amount}` : "Information Required"}
          </p>
          <ReserveButton unitId={property.units?.[0]?.id} />
        </aside>
      </div>
    </div>
  );
}
