"use client";

import { useEffect, useState } from "react";
import { useAuthToken } from "../../../lib/use-auth-token";
import { apiClient } from "../../../lib/api-client";
import { EmptyState } from "../../../components/EmptyState";

const REVIEW_CATEGORY_KEYS = [
  "accuracy",
  "security",
  "water",
  "internet",
  "cleanliness",
  "management",
  "value",
  "distance",
] as const;

function ReviewForm({
  bookingId,
  onSubmitted,
}: {
  bookingId: string;
  onSubmitted: () => void;
}) {
  const { token } = useAuthToken();
  const [overallRating, setOverallRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.createReview(token, bookingId, {
        overallRating,
        // A simple, honest default: every category gets the same overall
        // rating unless the tenant later wants a more granular form. Better
        // to collect a genuine single rating than to fabricate distinct
        // category scores the tenant never actually gave.
        categories: REVIEW_CATEGORY_KEYS.map((category) => ({ category, rating: overallRating })),
      });
      onSubmitted();
    } catch (err: any) {
      setError(err.message ?? "Could not submit your review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-3">
      <label htmlFor={`rating-${bookingId}`} className="text-sm text-chalk/70">
        Rate this stay
      </label>
      <select
        id={`rating-${bookingId}`}
        value={overallRating}
        onChange={(e) => setOverallRating(Number(e.target.value))}
        className="rounded-ticket border border-chalk/20 px-2 py-1 text-sm"
      >
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>
            {n} / 5
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-ticket bg-signal px-3 py-1 font-mono text-xs uppercase text-paper disabled:opacity-40"
      >
        {submitting ? "Submitting\u2026" : "Leave a review"}
      </button>
      {error ? <span className="text-xs text-murram">{error}</span> : null}
    </form>
  );
}

export default function MyBookingsPage() {
  const { token, ready } = useAuthToken();
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadDashboard() {
    if (!token) return;
    apiClient
      .getTenantDashboard(token)
      .then(setDashboard)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    if (!ready || !token) return;
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token]);

  if (!ready || (!dashboard && !error)) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-chalk/60">Loading your bookings\u2026</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="route-headline text-4xl">My bookings</h1>

      {error ? (
        <p role="alert" className="mt-4 rounded-ticket bg-murram/10 px-3 py-2 text-sm text-murram">
          {error}
        </p>
      ) : null}

      {dashboard?.bookings?.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No bookings yet"
            description="Once you reserve a unit, it'll show up here with its payment and agreement status."
          />
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {dashboard?.bookings?.map((booking: any) => (
            <div key={booking.id} className="ticket-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-lg">{booking.unit?.property?.title}</p>
                  <p className="mt-1 font-mono text-xs uppercase tracking-widest text-chalk/50">
                    Booking status: {booking.status}
                  </p>
                </div>
                <span className="fare-badge">
                  KES {Number(booking.agreedRent).toLocaleString()}/mo
                </span>
              </div>

              {booking.installments?.length ? (
                <div className="mt-3 text-sm text-chalk/70">
                  {booking.installments.filter((i: any) => i.paidAt).length} of{" "}
                  {booking.installments.length} instalments paid
                </div>
              ) : null}

              {booking.agreements?.length ? (
                <div className="mt-2 text-sm text-chalk/70">
                  Agreement status: {booking.agreements[0].status}
                </div>
              ) : null}

              {booking.status === "COMPLETED" ? (
                booking.reviews?.length ? (
                  <p className="mt-3 text-sm text-chalk/60">You&apos;ve already reviewed this stay.</p>
                ) : (
                  <ReviewForm bookingId={booking.id} onSubmitted={loadDashboard} />
                )
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
