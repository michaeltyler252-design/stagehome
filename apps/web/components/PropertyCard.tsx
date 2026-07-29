import Link from "next/link";
import type { PropertySummary } from "../lib/api-client";

function formatRent(property: PropertySummary): string {
  const rule = property.pricingRules?.[0];
  if (!rule) return "Rent: Information Required";
  const currency = rule.currency ?? "KES";
  const min = Number(rule.rentAmountMin).toLocaleString();
  const max = rule.rentAmountMax ? Number(rule.rentAmountMax).toLocaleString() : null;
  return max ? `${currency} ${min}\u2013${max}` : `${currency} ${min}`;
}

export function PropertyCard({ property }: { property: PropertySummary }) {
  return (
    <Link
      href={`/properties/${property.slug}`}
      className="ticket-card group flex flex-col transition-shadow hover:shadow-md"
    >
      <div className="aspect-[4/3] w-full bg-navy/10">
        {property.media?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={property.media[0].storageKey}
            alt={property.media[0].altText ?? property.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-xs text-navy/50">
            Photo pending verification
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg leading-tight group-hover:text-murram">
            {property.title}
          </h3>
          <span className="verified-stamp shrink-0">Verified</span>
        </div>
        <p className="text-sm text-chalk/70">
          {property.estate?.name ? `${property.estate.name}, ` : ""}
          {property.county.name}
        </p>
        {property.category ? (
          <p className="font-mono text-xs uppercase tracking-wide text-navy">
            {property.category.name}
          </p>
        ) : null}
        <p className="mt-auto pt-2 font-mono text-base font-semibold">{formatRent(property)}</p>
      </div>
    </Link>
  );
}
