import type { Metadata } from "next";

// Part L: private/account areas must never be indexed, defense-in-depth
// alongside the robots.txt disallow rules in app/robots.ts.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
