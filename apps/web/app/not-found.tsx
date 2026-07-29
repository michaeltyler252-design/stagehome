import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-chalk/50">Error 404</p>
      <h1 className="route-headline mt-2 text-4xl">This listing isn&apos;t here</h1>
      <p className="mt-3 text-chalk/70">
        The page you&apos;re looking for may have moved, been unpublished during verification, or
        never existed. Let&apos;s get you back on track.
      </p>

      <form action="/search" className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <input
          type="search"
          name="keyword"
          placeholder="Search estates, campuses, or property names"
          className="w-full rounded-ticket border border-chalk/20 px-4 py-2 focus:border-murram sm:w-80"
        />
        <button
          type="submit"
          className="rounded-ticket bg-murram px-5 py-2 font-display uppercase tracking-wide text-paper transition-colors hover:bg-navy"
        >
          Search listings
        </button>
      </form>

      <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm font-semibold">
        <Link href="/" className="hover:text-murram">
          Return home
        </Link>
        <Link href="/counties" className="hover:text-murram">
          Browse by county
        </Link>
        <Link href="/universities" className="hover:text-murram">
          Browse by university
        </Link>
      </div>
    </div>
  );
}
