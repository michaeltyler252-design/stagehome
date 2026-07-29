"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../lib/api-client";

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await apiClient.register(form);
      sessionStorage.setItem("accessToken", result.accessToken);
      sessionStorage.setItem("refreshToken", result.refreshToken);
      router.push("/manager/properties");
    } catch (err: any) {
      setError(err.message ?? "Could not create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="route-headline text-3xl">Create an account</h1>
      <p className="mt-2 text-sm text-chalk/70">
        Password must be at least 10 characters. We&apos;ll ask you to verify your
        phone number before your first booking.
      </p>

      {error ? (
        <p role="alert" className="mt-4 rounded-ticket bg-murram/10 px-3 py-2 text-sm text-murram">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="block font-mono text-xs uppercase tracking-widest text-chalk/60">
              First name
            </label>
            <input
              id="firstName"
              value={form.firstName}
              onChange={update("firstName")}
              className="mt-1 w-full rounded-ticket border border-chalk/20 px-3 py-2 focus:border-murram"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block font-mono text-xs uppercase tracking-widest text-chalk/60">
              Last name
            </label>
            <input
              id="lastName"
              value={form.lastName}
              onChange={update("lastName")}
              className="mt-1 w-full rounded-ticket border border-chalk/20 px-3 py-2 focus:border-murram"
            />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="block font-mono text-xs uppercase tracking-widest text-chalk/60">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={update("email")}
            className="mt-1 w-full rounded-ticket border border-chalk/20 px-3 py-2 focus:border-murram"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block font-mono text-xs uppercase tracking-widest text-chalk/60">
            Phone
          </label>
          <input
            id="phone"
            type="tel"
            required
            placeholder="+2547XXXXXXXX"
            value={form.phone}
            onChange={update("phone")}
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
            minLength={10}
            value={form.password}
            onChange={update("password")}
            className="mt-1 w-full rounded-ticket border border-chalk/20 px-3 py-2 focus:border-murram"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-ticket bg-murram px-4 py-3 font-display uppercase tracking-wide text-paper hover:bg-navy disabled:opacity-50"
        >
          {loading ? "Creating account\u2026" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-chalk/60">
        Already have an account?{" "}
        <a href="/sign-in" className="font-semibold text-murram hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}
