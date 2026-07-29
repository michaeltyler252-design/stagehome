"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useAuthToken } from "../../../lib/use-auth-token";
import { apiClient } from "../../../lib/api-client";
import { EmptyState } from "../../../components/EmptyState";

interface Organisation {
  id: string;
  name: string;
  status: string;
}

function PropertyReviewsPanel({ propertyId }: { propertyId: string }) {
  const { token } = useAuthToken();
  const [reviews, setReviews] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    apiClient
      .listPropertyReviews(propertyId)
      .then(setReviews)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  async function handleRespond(reviewId: string) {
    if (!token) return;
    const body = drafts[reviewId]?.trim();
    if (!body) return;
    setBusyId(reviewId);
    try {
      await apiClient.respondToReview(token, reviewId, body);
      setDrafts((prev) => ({ ...prev, [reviewId]: "" }));
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (error) {
    return <p className="text-sm text-murram">{error}</p>;
  }
  if (!reviews) {
    return <p className="text-sm text-chalk/60">Loading reviews\u2026</p>;
  }
  if (reviews.length === 0) {
    return <p className="text-sm text-chalk/60">No reviews yet for this property.</p>;
  }

  return (
    <ul className="space-y-3">
      {reviews.map((review: any) => (
        <li key={review.id} className="rounded-ticket border border-chalk/10 p-3">
          <p className="font-display text-base">{Number(review.overallRating).toFixed(1)} / 5</p>
          {review.responses?.length ? (
            review.responses.map((response: any) => (
              <p key={response.id} className="mt-2 border-l-2 border-chalk/20 pl-3 text-sm text-chalk/70">
                Your response: {response.body}
              </p>
            ))
          ) : (
            <div className="mt-2 flex gap-2">
              <input
                value={drafts[review.id] ?? ""}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [review.id]: e.target.value }))}
                placeholder="Write a public response\u2026"
                className="flex-1 rounded-ticket border border-chalk/20 px-2 py-1 text-sm"
              />
              <button
                type="button"
                disabled={busyId === review.id}
                onClick={() => handleRespond(review.id)}
                className="rounded-ticket bg-signal px-3 py-1 font-mono text-xs uppercase text-paper disabled:opacity-40"
              >
                Respond
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function ManagerPropertiesPage() {
  const { token, ready } = useAuthToken();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [newOrgName, setNewOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !token) return;
    apiClient
      .listMyOrganisations(token)
      .then((orgs) => {
        setOrganisations(orgs);
        if (orgs.length > 0) {
          setSelectedOrgId(orgs[0].id);
          localStorage.setItem("selectedOrganisationId", orgs[0].id);
        }
      })
      .catch((err) => setError(err.message));
  }, [ready, token]);

  function selectOrganisation(id: string) {
    setSelectedOrgId(id);
    localStorage.setItem("selectedOrganisationId", id);
  }

  useEffect(() => {
    if (!token || !selectedOrgId) return;
    apiClient
      .listOrganisationProperties(token, selectedOrgId)
      .then(setProperties)
      .catch((err) => setError(err.message));
  }, [token, selectedOrgId]);

  async function handleCreateOrganisation(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const org = await apiClient.createOrganisation(token, { name: newOrgName });
      setOrganisations((prev) => [...prev, org]);
      selectOrganisation(org.id);
      setNewOrgName("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitForVerification(propertyId: string) {
    if (!token) return;
    try {
      await apiClient.submitPropertyForVerification(token, propertyId);
      if (selectedOrgId) {
        const refreshed = await apiClient.listOrganisationProperties(token, selectedOrgId);
        setProperties(refreshed);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (!ready) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-chalk/60">Loading your dashboard\u2026</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="route-headline text-4xl">Manager dashboard</h1>
        {selectedOrgId ? (
          <Link
            href="/manager/properties/new"
            className="rounded-ticket bg-murram px-4 py-2 font-display uppercase tracking-wide text-paper hover:bg-navy"
          >
            + New property
          </Link>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-ticket bg-murram/10 px-3 py-2 text-sm text-murram">
          {error}
        </p>
      ) : null}

      {organisations.length === 0 ? (
        <div className="mt-8 max-w-md">
          <h2 className="font-display text-xl uppercase">Set up your organisation</h2>
          <p className="mt-2 text-sm text-chalk/70">
            Properties belong to an organisation, not to you personally, so
            you can add staff with scoped roles later (Part K: Owner,
            Manager, Accountant, Receptionist, Maintenance, Analyst).
          </p>
          <form onSubmit={handleCreateOrganisation} className="mt-4 flex gap-2">
            <label htmlFor="orgName" className="sr-only">
              Organisation name
            </label>
            <input
              id="orgName"
              required
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="e.g. Karen Housing Ltd"
              className="flex-1 rounded-ticket border border-chalk/20 px-3 py-2 focus:border-murram"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-ticket bg-murram px-4 py-2 font-display uppercase tracking-wide text-paper hover:bg-navy disabled:opacity-50"
            >
              Create
            </button>
          </form>
        </div>
      ) : (
        <>
          {organisations.length > 1 ? (
            <label className="mt-6 block max-w-xs">
              <span className="font-mono text-xs uppercase tracking-widest text-chalk/60">
                Organisation
              </span>
              <select
                value={selectedOrgId ?? ""}
                onChange={(e) => selectOrganisation(e.target.value)}
                className="mt-1 w-full rounded-ticket border border-chalk/20 px-3 py-2"
              >
                {organisations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {properties.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                title="No properties yet"
                description="Add your first property to start the verification process. It stays private until our team confirms it."
              />
            </div>
          ) : (
            <div className="mt-8 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-chalk font-mono text-xs uppercase tracking-widest text-chalk/60">
                    <th className="py-2 pr-4">Title</th>
                    <th className="py-2 pr-4">Reference</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Units</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((property) => (
                    <Fragment key={property.id}>
                      <tr className="border-b border-chalk/10">
                        <td className="py-3 pr-4 font-semibold">{property.title}</td>
                        <td className="py-3 pr-4 font-mono text-xs">{property.publicReference}</td>
                        <td className="py-3 pr-4">
                          <span className="fare-badge">{property.publicationStatus}</span>
                        </td>
                        <td className="py-3 pr-4">{property.units?.length ?? 0}</td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-col items-start gap-1">
                            {property.publicationStatus === "DRAFT" ? (
                              <button
                                type="button"
                                onClick={() => handleSubmitForVerification(property.id)}
                                className="font-mono text-xs uppercase text-murram hover:underline"
                              >
                                Submit for verification
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedPropertyId((current) =>
                                  current === property.id ? null : property.id
                                )
                              }
                              className="font-mono text-xs uppercase text-navy hover:underline"
                            >
                              {expandedPropertyId === property.id ? "Hide reviews" : "Reviews"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedPropertyId === property.id ? (
                        <tr>
                          <td colSpan={5} className="bg-navy/5 px-4 py-4">
                            <PropertyReviewsPanel propertyId={property.id} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
