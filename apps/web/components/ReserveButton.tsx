"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../lib/api-client";

type Step = "idle" | "quoting" | "holding" | "confirming" | "confirmed" | "error";

export function ReserveButton({ unitId }: { unitId: string | undefined }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleReserve() {
    const token = sessionStorage.getItem("accessToken");
    if (!token) {
      router.push("/sign-in");
      return;
    }
    if (!unitId) {
      setStep("error");
      setMessage("This listing doesn't have a bookable unit yet.");
      return;
    }

    try {
      setStep("quoting");
      const quote = await apiClient.createQuote(token, unitId);

      setStep("holding");
      const hold = await apiClient.createHold(token, quote.id);

      setStep("confirming");
      await apiClient.confirmBooking(token, hold.id);

      setStep("confirmed");
      setMessage(
        "Reserved. This booking is pending payment — payment collection goes live in Milestone 8."
      );
    } catch (err: any) {
      setStep("error");
      setMessage(err.message ?? "Could not complete the reservation. Please try again.");
    }
  }

  if (step === "confirmed") {
    return (
      <div className="mt-6 rounded-ticket bg-signal-light px-4 py-3 text-sm text-signal">
        {message}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleReserve}
        disabled={step === "quoting" || step === "holding" || step === "confirming"}
        className="mt-6 w-full rounded-ticket bg-murram px-4 py-3 font-display uppercase tracking-wide text-paper transition-colors hover:bg-navy disabled:cursor-wait disabled:opacity-70"
      >
        {step === "idle" && "Reserve this unit"}
        {step === "quoting" && "Getting your quote\u2026"}
        {step === "holding" && "Holding this unit\u2026"}
        {step === "confirming" && "Confirming\u2026"}
        {step === "error" && "Try again"}
      </button>
      {message ? (
        <p role="alert" className="mt-2 text-sm text-murram">
          {message}
        </p>
      ) : null}
    </>
  );
}
