"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const CATEGORIES = [
  { key: "", label: "Any type" },
  { key: "bedsitter", label: "Bedsitter" },
  { key: "studio", label: "Studio" },
  { key: "one_bedroom", label: "One-bedroom" },
  { key: "two_bedroom", label: "Two-bedroom" },
  { key: "hostel", label: "Hostel" },
  { key: "student_residence", label: "Student residence" },
  { key: "shared_room", label: "Shared room" },
];

const SORT_OPTIONS = [
  { key: "recommended", label: "Recommended" },
  { key: "nearest", label: "Nearest to campus" },
  { key: "lowest_rent", label: "Lowest rent" },
  { key: "highest_rent", label: "Highest rent" },
  { key: "newest", label: "Newest" },
  { key: "highest_verified_rating", label: "Highest rated" },
  { key: "most_reviewed", label: "Most reviewed" },
  { key: "available_soonest", label: "Available soonest" },
];

export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");
  const [categoryKey, setCategoryKey] = useState(searchParams.get("categoryKey") ?? "");
  const [minRent, setMinRent] = useState(searchParams.get("minRent") ?? "");
  const [maxRent, setMaxRent] = useState(searchParams.get("maxRent") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "recommended");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.set("keyword", keyword);
    if (categoryKey) params.set("categoryKey", categoryKey);
    if (minRent) params.set("minRent", minRent);
    if (maxRent) params.set("maxRent", maxRent);
    if (sort && sort !== "recommended") params.set("sort", sort);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="ticket-card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
      aria-label="Filter listings"
    >
      <div className="lg:col-span-2">
        <label htmlFor="keyword" className="block font-mono text-xs uppercase tracking-widest text-chalk/60">
          Keyword
        </label>
        <input
          id="keyword"
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Estate, property, or campus"
          className="mt-1 w-full rounded-ticket border border-chalk/20 px-3 py-2 focus:border-murram"
        />
      </div>

      <div>
        <label htmlFor="categoryKey" className="block font-mono text-xs uppercase tracking-widest text-chalk/60">
          Property type
        </label>
        <select
          id="categoryKey"
          value={categoryKey}
          onChange={(e) => setCategoryKey(e.target.value)}
          className="mt-1 w-full rounded-ticket border border-chalk/20 px-3 py-2 focus:border-murram"
        >
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="minRent" className="block font-mono text-xs uppercase tracking-widest text-chalk/60">
          Min rent (KES)
        </label>
        <input
          id="minRent"
          type="number"
          min={0}
          value={minRent}
          onChange={(e) => setMinRent(e.target.value)}
          className="mt-1 w-full rounded-ticket border border-chalk/20 px-3 py-2 focus:border-murram"
        />
      </div>

      <div>
        <label htmlFor="maxRent" className="block font-mono text-xs uppercase tracking-widest text-chalk/60">
          Max rent (KES)
        </label>
        <input
          id="maxRent"
          type="number"
          min={0}
          value={maxRent}
          onChange={(e) => setMaxRent(e.target.value)}
          className="mt-1 w-full rounded-ticket border border-chalk/20 px-3 py-2 focus:border-murram"
        />
      </div>

      <div>
        <label htmlFor="sort" className="block font-mono text-xs uppercase tracking-widest text-chalk/60">
          Sort by
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="mt-1 w-full rounded-ticket border border-chalk/20 px-3 py-2 focus:border-murram"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="rounded-ticket bg-murram px-5 py-2 font-display uppercase tracking-wide text-paper transition-colors hover:bg-navy lg:col-span-5"
      >
        Update results
      </button>
    </form>
  );
}
