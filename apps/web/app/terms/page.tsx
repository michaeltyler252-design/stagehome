import type { Metadata } from "next";
import { canonicalUrl } from "../../lib/seo";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms that govern use of StageHome's student housing marketplace.",
  alternates: { canonical: canonicalUrl("/terms") },
};

const SECTIONS = [
  {
    title: "Who this applies to",
    body: "These terms apply to anyone browsing, searching, or booking through StageHome, and to any organisation listing property through a manager account.",
  },
  {
    title: "What StageHome is",
    body: "StageHome is a marketplace connecting students with verified housing near Kenyan universities. We are not the landlord or letting agent for any listing unless explicitly stated — the tenancy agreement is between you and the property's managing organisation.",
  },
  {
    title: "Verified listings",
    body: "A listing only carries the verified badge once it has passed StageHome's documentary and contact-confirmation checks (see /how-it-works). We work to keep listings accurate but cannot guarantee that a property's condition matches its description at every moment — always inspect before moving in where possible.",
  },
  {
    title: "Bookings and payments",
    body: "A booking hold reserves a unit for a limited window. Confirming a booking may require a deposit or booking fee processed through our payment provider. Refund eligibility depends on the cancellation policy attached to that specific listing at the time of booking.",
  },
  {
    title: "Manager obligations",
    body: "Organisations listing property agree to keep listing information accurate, honour confirmed bookings, and respond to verification and support requests in good faith. Fraudulent listings will be rejected, removed, and reported.",
  },
  {
    title: "Reviews",
    body: "Only a tenant with a completed, verified booking may leave a review for that property. Reviews must reflect a genuine experience; StageHome may remove reviews that violate this or contain abusive content.",
  },
  {
    title: "Account suspension",
    body: "We may suspend accounts that provide false information, attempt to circumvent verification, or engage in fraudulent or abusive behaviour.",
  },
  {
    title: "Limitation of liability",
    body: "StageHome facilitates discovery and booking but is not liable for the acts or omissions of independent property managers, except where required by Kenyan law.",
  },
  {
    title: "Changes to these terms",
    body: "We may update these terms from time to time; continued use of StageHome after an update constitutes acceptance of the revised terms.",
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="route-headline text-4xl">Terms &amp; Conditions</h1>
      <p className="mt-2 text-sm text-chalk/50">Last updated: July 2026</p>
      <p className="mt-4 text-chalk/70">
        By using StageHome, you agree to the terms below. Please read them alongside our{" "}
        <a href="/privacy-policy" className="underline hover:text-murram">
          Privacy Policy
        </a>
        .
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
