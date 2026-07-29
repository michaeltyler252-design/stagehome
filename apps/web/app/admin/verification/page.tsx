"use client";

import { useEffect, useState } from "react";
import { useAuthToken } from "../../../lib/use-auth-token";
import { apiClient } from "../../../lib/api-client";
import { EmptyState } from "../../../components/EmptyState";

export default function AdminVerificationPage() {
  const { token, ready } = useAuthToken();
  const [stats, setStats] = useState<any | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [promotionQueue, setPromotionQueue] = useState<any[]>([]);
  const [verificationQueue, setVerificationQueue] = useState<any[]>([]);
  const [propertyPromotionQueue, setPropertyPromotionQueue] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadAll() {
    if (!token) return;
    try {
      const [
        dashboardData,
        queueData,
        universityPromotionData,
        universityVerificationData,
        propertyPromotionData,
      ] = await Promise.all([
        apiClient.getAdminDashboard(token),
        apiClient.listVerificationQueue(token),
        apiClient.listUniversityPromotionQueue(token),
        apiClient.listUniversityVerificationQueue(token),
        apiClient.listPropertyPromotionQueue(token),
      ]);
      setStats(dashboardData);
      setQueue(queueData);
      setPromotionQueue(universityPromotionData);
      setVerificationQueue(universityVerificationData);
      setPropertyPromotionQueue(propertyPromotionData);
    } catch (err: any) {
      setError(err.message ?? "Could not load admin dashboard. Are you signed in as an Admin?");
    }
  }

  useEffect(() => {
    if (!ready) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token]);

  async function handlePromoteProperty(rawPropertyRecordId: string) {
    if (!token) return;
    setBusyId(rawPropertyRecordId);
    try {
      await apiClient.promoteProperty(token, rawPropertyRecordId);
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleApprove(propertyId: string) {
    if (!token) return;
    setBusyId(propertyId);
    try {
      await apiClient.approveProperty(token, propertyId);
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(propertyId: string) {
    if (!token) return;
    const reason = window.prompt("Reason for rejecting this listing:");
    if (!reason) return;
    setBusyId(propertyId);
    try {
      await apiClient.rejectProperty(token, propertyId, reason);
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handlePromoteUniversity(rawUniversityRecordId: string) {
    if (!token) return;
    setBusyId(rawUniversityRecordId);
    try {
      await apiClient.promoteUniversity(token, rawUniversityRecordId);
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleVerifyUniversity(universityId: string) {
    if (!token) return;
    setBusyId(universityId);
    try {
      await apiClient.verifyUniversity(token, universityId);
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRejectUniversity(universityId: string) {
    if (!token) return;
    const reason = window.prompt("Reason for rejecting this university:");
    if (!reason) return;
    setBusyId(universityId);
    try {
      await apiClient.rejectUniversity(token, universityId, reason);
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!ready) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-chalk/60">Loading\u2026</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="route-headline text-4xl">Admin dashboard</h1>

      {error ? (
        <p role="alert" className="mt-4 rounded-ticket bg-murram/10 px-3 py-2 text-sm text-murram">
          {error}
        </p>
      ) : null}

      {stats ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="ticket-card p-4">
            <p className="font-mono text-xs uppercase tracking-widest text-chalk/50">Verification queue</p>
            <p className="mt-1 font-display text-3xl">{stats.verificationQueueCount}</p>
          </div>
          <div className="ticket-card p-4">
            <p className="font-mono text-xs uppercase tracking-widest text-chalk/50">Flagged conflicts</p>
            <p className="mt-1 font-display text-3xl text-murram">{stats.flaggedConflicts}</p>
          </div>
          <div className="ticket-card p-4">
            <p className="font-mono text-xs uppercase tracking-widest text-chalk/50">Total users</p>
            <p className="mt-1 font-display text-3xl">{stats.totalUsers}</p>
          </div>
          <div className="ticket-card p-4">
            <p className="font-mono text-xs uppercase tracking-widest text-chalk/50">Refunds needing dual control</p>
            <p className="mt-1 font-display text-3xl">{stats.refundsPendingDualControl}</p>
          </div>
        </div>
      ) : null}

      <h2 className="mt-10 font-display text-2xl uppercase">Property promotion queue</h2>
      <p className="mt-1 text-sm text-chalk/60">
        Raw property records imported by the staging pipeline, not yet promoted into the review
        queue below.
      </p>

      {propertyPromotionQueue.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nothing waiting on promotion"
            description="Staged property records appear here once a county import batch runs."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {propertyPromotionQueue.map((record: any) => (
            <div key={record.id} className="ticket-card flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-display text-lg">{record.propertyName}</p>
                <p className="font-mono text-xs text-chalk/50">
                  {record.universityName ?? "No university on file"} &middot; {record.batch?.county ?? "Unknown county"}
                  {record.conflictStatus === "FLAGGED" ? (
                    <span className="ml-2 text-murram">FLAGGED CONFLICT</span>
                  ) : null}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === record.id}
                onClick={() => handlePromoteProperty(record.id)}
                className="rounded-ticket bg-signal px-3 py-2 font-mono text-xs uppercase text-paper disabled:opacity-40"
              >
                Promote
              </button>
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-10 font-display text-2xl uppercase">Verification queue</h2>

      {queue.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nothing waiting on review"
            description="Properties appear here once a manager submits them for verification."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {queue.map((property: any) => (
            <div key={property.id} className="ticket-card flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-display text-lg">{property.title}</p>
                <p className="font-mono text-xs text-chalk/50">
                  {property.county?.name} &middot; {property.publicReference}
                  {property.conflictStatus === "FLAGGED" ? (
                    <span className="ml-2 text-murram">FLAGGED CONFLICT</span>
                  ) : null}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busyId === property.id || property.conflictStatus === "FLAGGED"}
                  onClick={() => handleApprove(property.id)}
                  title={
                    property.conflictStatus === "FLAGGED"
                      ? "Resolve the data conflict before approving"
                      : undefined
                  }
                  className="rounded-ticket bg-signal px-3 py-2 font-mono text-xs uppercase text-paper disabled:opacity-40"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busyId === property.id}
                  onClick={() => handleReject(property.id)}
                  className="rounded-ticket bg-murram px-3 py-2 font-mono text-xs uppercase text-paper disabled:opacity-40"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-12 font-display text-2xl uppercase">University promotion queue</h2>
      <p className="mt-1 text-sm text-chalk/60">
        Raw records imported by the staging pipeline, not yet promoted into the public university
        directory.
      </p>

      {promotionQueue.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nothing waiting on promotion"
            description="Staged university records appear here once a county import batch runs."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {promotionQueue.map((record: any) => (
            <div key={record.id} className="ticket-card flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-display text-lg">{record.universityName}</p>
                <p className="font-mono text-xs text-chalk/50">
                  {record.campusName ?? "No campus name on file"} &middot; {record.batch?.county ?? "Unknown county"}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === record.id}
                onClick={() => handlePromoteUniversity(record.id)}
                className="rounded-ticket bg-signal px-3 py-2 font-mono text-xs uppercase text-paper disabled:opacity-40"
              >
                Promote
              </button>
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-12 font-display text-2xl uppercase">University verification queue</h2>
      <p className="mt-1 text-sm text-chalk/60">
        Promoted universities awaiting confirmation against the Commission for University Education
        register. Only VERIFIED universities appear on the public site.
      </p>

      {verificationQueue.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nothing waiting on verification"
            description="Promote a staged record above to send it here for the CUE-register check."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {verificationQueue.map((university: any) => (
            <div key={university.id} className="ticket-card flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-display text-lg">{university.officialName}</p>
                <p className="font-mono text-xs text-chalk/50">{university.county?.name}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busyId === university.id}
                  onClick={() => handleVerifyUniversity(university.id)}
                  className="rounded-ticket bg-signal px-3 py-2 font-mono text-xs uppercase text-paper disabled:opacity-40"
                >
                  Verify
                </button>
                <button
                  type="button"
                  disabled={busyId === university.id}
                  onClick={() => handleRejectUniversity(university.id)}
                  className="rounded-ticket bg-murram px-3 py-2 font-mono text-xs uppercase text-paper disabled:opacity-40"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
