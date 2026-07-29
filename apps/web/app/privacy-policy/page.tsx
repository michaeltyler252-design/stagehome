import type { Metadata } from "next";
import { canonicalUrl } from "../../lib/seo";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How StageHome collects, uses, and protects your personal information.",
  alternates: { canonical: canonicalUrl("/privacy-policy") },
};

const SECTIONS = [
  {
    title: "What we collect",
    body: "Account details you give us directly (name, email, phone number), verification documents when you list or manage a property, and usage data such as searches and saved listings. Payment details are handled by our licensed payment provider (M-Pesa/Daraja) — StageHome never stores your M-Pesa PIN or full card numbers.",
  },
  {
    title: "How we use it",
    body: "To match you with verified student accommodation, process bookings and payments, confirm your identity for manager accounts, send booking and account notifications, and improve search relevance. We do not sell personal data to third parties.",
  },
  {
    title: "Location data",
    body: "Property pages show a jittered, privacy-safe map location rather than an exact address until a booking is confirmed. Exact coordinates are only shared with a confirmed tenant or the managing organisation.",
  },
  {
    title: "Who we share data with",
    body: "Property managers you book with (limited to what's needed to fulfil the booking), payment processors for transaction processing, and law enforcement only where legally required.",
  },
  {
    title: "Your rights",
    body: "You can request a copy of your data, ask us to correct inaccurate information, or request account deletion by contacting support. Some records (e.g. completed booking and payment history) may be retained where required for legal, tax, or dispute-resolution purposes.",
  },
  {
    title: "Data security",
    body: "We use encryption in transit (HTTPS/SSL) and at rest for sensitive fields, role-based access controls for staff, and audit logging on administrative actions.",
  },
  {
    title: "Changes to this policy",
    body: "We'll update the date below whenever this policy changes materially, and post a notice on the site for significant changes.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="route-headline text-4xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-chalk/50">Last updated: July 2026</p>
      <p className="mt-4 text-chalk/70">
        This policy explains what personal information StageHome collects, why, and how it&apos;s
        protected. If anything here is unclear, contact us and we&apos;ll explain it in plain language.
      </p>

      <div className="mt-8 space-y-6">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-xl uppercase">{section.title}</h2>
            <p className="mt-2 text-chalk/70">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
