import Link from "next/link";

const NAV_LINKS = [
  { href: "/universities", label: "Universities" },
  { href: "/counties", label: "Counties" },
  { href: "/search", label: "Search" },
  { href: "/blog", label: "Blog" },
  { href: "/how-it-works", label: "How it works" },
];

export function Header() {
  return (
    <header className="border-b-2 border-chalk bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 font-display text-2xl uppercase tracking-tight">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-ticket bg-murram text-paper"
          >
            SH
          </span>
          <span>
            Stage<span className="text-murram">Home</span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className="hidden gap-6 font-body text-sm font-semibold md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-murram">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/account/bookings"
            className="hidden font-body text-sm font-semibold hover:text-murram sm:inline"
          >
            My bookings
          </Link>
          <Link
            href="/sign-in"
            className="hidden font-body text-sm font-semibold hover:text-murram sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/manager/properties"
            className="fare-badge hover:bg-navy transition-colors"
          >
            List a property
          </Link>
        </div>
      </div>
    </header>
  );
}
