"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../lib/api-client";

export function FavouriteButton({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [isFavourited, setIsFavourited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount, check whether this property is already in the signed-in
  // user's favourites, so the button reflects real state rather than
  // always starting unfavourited.
  useEffect(() => {
    const token = sessionStorage.getItem("accessToken");
    if (!token) return;

    apiClient
      .listMyFavourites(token)
      .then((favourites) => {
        setIsFavourited(favourites.some((f: any) => f.propertyId === propertyId));
      })
      .catch(() => {
        // Not being able to check current favourite state isn't worth
        // surfacing an error for — the button just starts unfavourited.
      });
  }, [propertyId]);

  async function handleToggle() {
    const token = sessionStorage.getItem("accessToken");
    if (!token) {
      router.push("/sign-in");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (isFavourited) {
        await apiClient.removeFavourite(token, propertyId);
        setIsFavourited(false);
      } else {
        await apiClient.addFavourite(token, propertyId);
        setIsFavourited(true);
      }
    } catch (err: any) {
      setError(err.message ?? "Couldn't update your favourites. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        aria-pressed={isFavourited}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-ticket border border-navy/20 px-4 py-3 font-display uppercase tracking-wide text-navy transition-colors hover:bg-navy/5 disabled:cursor-wait disabled:opacity-70"
      >
        <span aria-hidden="true">{isFavourited ? "\u2605" : "\u2606"}</span>
        {isFavourited ? "Saved to favourites" : "Save to favourites"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-murram">
          {error}
        </p>
      ) : null}
    </div>
  );
}
