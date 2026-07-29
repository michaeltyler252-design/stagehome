import Link from "next/link";

const SOCIAL_LINKS = [
  { href: "https://facebook.com/stagehomeke", label: "Facebook" },
  { href: "https://instagram.com/stagehomeke", label: "Instagram" },
  { href: "https://x.com/stagehomeke", label: "X" },
  { href: "https://tiktok.com/@stagehomeke", label: "TikTok" },
  { href: "https://linkedin.com/company/stagehomeke", label: "LinkedIn" },
  { href: "https://youtube.com/@stagehomeke", label: "YouTube" },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t-2 border-chalk bg-chalk text-paper">
      <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg uppercase">StageHome</p>
          <p className="mt-2 text-sm text-paper/70">
            Verified student accommodation near Kenyan universities. Phase 1:
            Nairobi City.
          </p>
          <ul className="mt-4 flex flex-wrap gap-3 text-sm">
            {SOCIAL_LINKS.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-stage"
                  aria-label={`StageHome on ${social.label}`}
                >
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold uppercase tracking-wide text-paper/60">Explore</p>
          <ul className="mt-2 space-y-1">
            <li><Link href="/counties" className="hover:text-stage">Browse by county</Link></li>
            <li><Link href="/universities" className="hover:text-stage">Browse by university</Link></li>
            <li><Link href="/search" className="hover:text-stage">Search listings</Link></li>
            <li><Link href="/blog" className="hover:text-stage">Blog</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold uppercase tracking-wide text-paper/60">Trust &amp; safety</p>
          <ul className="mt-2 space-y-1">
            <li><Link href="/how-it-works" className="hover:text-stage">How verification works</Link></li>
            <li><Link href="/manager/properties" className="hover:text-stage">List a property</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold uppercase tracking-wide text-paper/60">Legal</p>
          <ul className="mt-2 space-y-1">
            <li><Link href="/privacy-policy" className="hover:text-stage">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-stage">Terms &amp; Conditions</Link></li>
            <li><Link href="/cookie-policy" className="hover:text-stage">Cookie Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-paper/10 px-4 py-4 text-center text-xs text-paper/50">
        &copy; {new Date().getFullYear()} StageHome. Every listing on StageHome is unverified until
        it carries a verified stamp.
      </div>
    </footer>
  );
}
