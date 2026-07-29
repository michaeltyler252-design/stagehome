import type { Metadata } from "next";
import { canonicalUrl } from "../../lib/seo";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How StageHome uses cookies and similar technologies.",
  alternates: { canonical: canonicalUrl("/cookie-policy") },
};

const COOKIE_TYPES = [
  {
    title: "Essential cookies",
    body: "Keep you signed in, remember your booking session, and secure the site against cross-site request forgery. The site cannot function correctly without these.",
  },
  {
    title: "Analytics cookies",
    body: "Help us understand which searches and listings are useful so we can improve the marketplace. These are anonymised where possible.",
  },
  {
    title: "Preference cookies",
    body: "Remember settings like your last search filters, so you don't have to re-enter them each visit.",
  },
];

export default function CookiePolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="route-headline text-4xl">Cookie Policy</h1>
      <p className="mt-2 text-sm text-chalk/50">Last updated: July 2026</p>
      <p className="mt-4 text-chalk/70">
        StageHome uses cookies and similar technologies to keep the site working and to understand
        how it&apos;s used. This page explains what we use and why.
      </p>

      <div className="mt-8 space-y-6">
        {COOKIE_TYPES.map((type) => (
          <section key={type.title}>
            <h2 className="font-display text-xl uppercase">{type.title}</h2>
            <p className="mt-2 text-chalk/70">{type.body}</p>
          </section>
        ))}
      </div>

      <section className="mt-6">
        <h2 className="font-display text-xl uppercase">Managing cookies</h2>
        <p className="mt-2 text-chalk/70">
          Most browsers let you clear or block cookies in their settings. Blocking essential
          cookies may prevent you from signing in or completing a booking.
        </p>
      </section>
    </div>
  );
}
