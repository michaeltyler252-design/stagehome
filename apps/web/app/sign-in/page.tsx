"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../lib/api-client";

type Mode = "password" | "otp-request" | "otp-verify";

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function storeSessionAndRedirect(result: { accessToken: string; refreshToken: string }) {
    // Milestone 3 scope: httpOnly cookie-based session storage is the
    // correct production approach and is wired in once the API sits behind
    // HTTPS in Milestone 15's deployment gate. For now, tokens are handed to
    // the client directly so the auth flow is fully testable end-to-end.
    sessionStorage.setItem("accessToken", result.accessToken);
    sessionStorage.setItem("refreshToken", result.refreshToken);
    router.push("/manager/properties");
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await apiClient.login({ email, password });
      storeSessionAndRedirect(result);
    } catch (err: any) {
      setError(err.message ?? "Sign-in failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiClient.requestOtp(phone);
      setMode("otp-verify");
    } catch (err: any) {
      setError(err.message ?? "Could not send a code to that number.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await apiClient.verifyOtp(phone, code);
      storeSessionAndRedirect(result);
    } catch (err: any) {
      setError(err.message ?? "Incorrect or expired code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="route-headline text-3xl">Sign in</h1>
      <div className="mt-6 flex gap-2 font-mono text-xs uppercase tracking-widest">
        <button
          type="button"
          onClick={() => setMode("password")}
          className={`rounded-ticket px-3 py-1.5 ${mode === "password" ? "bg-chalk text-paper" : "bg-chalk/10"}`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => setMode("otp-request")}
          className={`rounded-ticket px-3 py-1.5 ${mode !== "password" ? "bg-chalk text-paper" : "bg-chalk/10"}`}
        >
          Phone
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-ticket bg-murram/10 px-3 py-2 text-sm text-murram">
          {error}
        </p>
      ) : null}

      {mode === "password" ? (
        <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block font-mono text-xs uppercase tracking-widest text-chalk/60">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-ticket border border-chalk/20 px-3 py-2 focus:border-murram"
            />
          </div>
          <div>
            <label htmlFor="password" className="block font-mono text-xs uppercase tracking-widest text-chalk/60">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-ticket border border-chalk/20 px-3 py-2 focus:border-murram"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-ticket bg-murram px-4 py-3 font-display uppercase tracking-wide text-paper hover:bg-navy disabled:opacity-50"
          >
            {loading ? "Signing in\u2026" : "Sign in"}
          </button>
        </form>
      ) : mode === "otp-request" ? (
        <form onSubmit={handleOtpRequest} className="mt-6 space-y-4">
          <div>
            <label htmlFor="phone" className="block font-mono text-xs uppercase tracking-widest text-chalk/60">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              required
              placeholder="+2547XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-ticket border border-chalk/20 px-3 py-2 focus:border-murram"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-ticket bg-murram px-4 py-3 font-display uppercase tracking-wide text-paper hover:bg-navy disabled:opacity-50"
          >
            {loading ? "Sending code\u2026" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleOtpVerify} className="mt-6 space-y-4">
          <p className="text-sm text-chalk/70">Enter the 6-digit code sent to {phone}.</p>
          <input
            type="text"
            inputMode="numeric"
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-ticket border border-chalk/20 px-3 py-2 text-center font-mono text-lg tracking-[0.5em] focus:border-murram"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-ticket bg-murram px-4 py-3 font-display uppercase tracking-wide text-paper hover:bg-navy disabled:opacity-50"
          >
            {loading ? "Verifying\u2026" : "Verify and sign in"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-chalk/60">
        New to StageHome?{" "}
        <a href="/sign-up" className="font-semibold text-murram hover:underline">
          Create an account
        </a>
      </p>
    </div>
  );
}
