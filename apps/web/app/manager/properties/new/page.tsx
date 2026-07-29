"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthToken } from "../../../../lib/use-auth-token";
import { apiClient, type County } from "../../../../lib/api-client";

export default function NewPropertyPage() {
  const router = useRouter();
  const { token, ready } = useAuthToken();
  const [counties, setCounties] = useState<County[]>([]);
  const [form, setForm] = useState({ title: "", countyId: "", description: "", address: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [organisationId, setOrganisationId] = useState<string | null>(null);

  useEffect(() => {
    setOrganisationId(localStorage.getItem("selectedOrganisationId"));
    apiClient.listCounties().then(setCounties).catch(() => setCounties([]));
  }, []);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !organisationId) {
      setError("Set up your organisation first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const property = await apiClient.createManagerProperty(token, organisationId, form);
      router.push("/manager/properties");
      return property;
    } catch (err: any) {
      setError(err.message ?? "Could not create the property.");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-chalk/60">Loading\u2026</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="route-headline text-3xl">List a property</h1>
      <p className="mt-2 text-sm text-chalk/70">
        This listing stays private (unverified, unpublished) until our team
        confirms it. Nothing here reaches search until then.
      </p>

      {error ? (
        <p role="alert" className="mt-4 rounded-ticket bg-murram/10 px-3 py-2 text-sm text-murram">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="title" className="block font-mono text-xs uppercase tracking-widest text-chalk/60">
            Property title
          </label>
          <input
            id="title"
            required
            value={form.title}
            onChange={update("title")}
            placeholder="e.g. Kilimani Premium Studios"
            className="mt-1 w-full rounded-ticket border border-chalk/20 px-3 py-2 focus:border-murram"
          />
        </div>
        <div>
          <label htmlFor="countyId" className="block font-mono text-xs uppercase tracking-widest text-chalk/60">
            County
          </label>
          <select
            id="countyId"
            required
            value={form.countyId}
            onChange={update("countyId")}
            className="mt-1 w-full rounded-ticket border border-chalk/20 px-3 py-2"
          >
            <option value="" disabled>
              Select a county
            </option>
            {counties.map((c) => (
              <option key={c.slug} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="address" className="block font-mono text-xs uppercase tracking-widest text-chalk/60">
            Address
          </label>
          <input
            id="address"
            value={form.address}
            onChange={update("address")}
            className="mt-1 w-full rounded-ticket border border-chalk/20 px-3 py-2 focus:border-murram"
          />
        </div>
        <div>
          <label htmlFor="description" className="block font-mono text-xs uppercase tracking-widest text-chalk/60">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            value={form.description}
            onChange={update("description")}
            className="mt-1 w-full rounded-ticket border border-chalk/20 px-3 py-2 focus:border-murram"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-ticket bg-murram px-4 py-3 font-display uppercase tracking-wide text-paper hover:bg-navy disabled:opacity-50"
        >
          {loading ? "Saving\u2026" : "Save as draft"}
        </button>
      </form>
    </div>
  );
}
