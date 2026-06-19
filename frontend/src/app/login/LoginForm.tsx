"use client";

import { apiRoutes } from "@/lib/api";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type LoginResponse = {
  message: string;
  redirect_to: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: "admin" | "driver" | "passenger";
    is_verified: boolean;
  };
};

type ValidationErrorResponse = {
  message?: string;
  errors?: Record<string, string[]>;
};

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const response = await fetch(apiRoutes.login, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = (await response.json()) as ValidationErrorResponse;
        const firstError = data.errors
          ? Object.values(data.errors).flat()[0]
          : null;
        throw new Error(firstError ?? data.message ?? "Login failed.");
      }

      const data = (await response.json()) as LoginResponse;
      localStorage.setItem("triwheel_user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("triwheel_user_change"));
      router.push(data.redirect_to);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Login failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <label className="grid gap-2 text-sm font-bold">
        Email address
        <input
          autoComplete="email"
          className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
      </label>

      <label className="grid gap-2 text-sm font-bold">
        Password
        <input
          autoComplete="current-password"
          className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          name="password"
          placeholder="Enter your password"
          required
          type="password"
        />
      </label>

      <button
        className="rounded-2xl bg-orange-500 px-6 py-4 font-black text-white shadow-xl shadow-orange-500/25 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Logging in..." : "Login to TriWheel"}
      </button>
    </form>
  );
}
