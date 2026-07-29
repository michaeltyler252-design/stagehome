"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HeroSearchBar() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("keyword", keyword.trim());
    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-xl flex-col gap-2 rounded-ticket border-2 border-chalk bg-white p-2 sm:flex-row"
      role="search"
      aria-label="Search for student housing"
    >
      <label htmlFor="hero-search" className="sr-only">
        Search by university, estate, or property name
      </label>
      <input
        id="hero-search"
        type="search"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="Search by university, estate, or property"
        className="flex-1 rounded-ticket border-0 px-3 py-3 font-body text-base focus:outline-none focus:ring-0"
      />
      <button
        type="submit"
        className="rounded-ticket bg-murram px-6 py-3 font-display uppercase tracking-wide text-paper transition-colors hover:bg-navy"
      >
        Find a stage
      </button>
    </form>
  );
}
