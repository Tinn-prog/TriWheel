"use client";

import { apiFetch, apiRoutes } from "@/lib/api";
import Link from "next/link";
import { FormEvent, useState } from "react";

type LoginResponse = {
  message: string;
  redirect_to: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: "admin" | "driver" | "passenger";
    admin_role?: string | null;
    is_verified: boolean;
  };
  token: string;
};

type ValidationErrorResponse = {
  message?: string;
  errors?: Record<string, string[]>;
};

export function LoginForm({
  defaultEmail = "",
  defaultPassword = "",
}: {
  defaultEmail?: string;
  defaultPassword?: string;
}) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const response = await apiFetch(apiRoutes.login, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      let data: LoginResponse | ValidationErrorResponse;

      try {
        data = (await response.json()) as LoginResponse | ValidationErrorResponse;
      } catch {
        throw new Error("Login request failed. Please try again.");
      }

      if (!response.ok) {
        const validation = data as ValidationErrorResponse;
        const firstError = validation.errors
          ? Object.values(validation.errors).flat()[0]
          : null;
        throw new Error(firstError ?? validation.message ?? "Login failed.");
      }

      const loginData = data as LoginResponse;
      localStorage.setItem("triwheel_user", JSON.stringify(loginData.user));
      localStorage.setItem("triwheel_token", loginData.token);
      window.location.assign(loginData.redirect_to);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Login failed. Please try again.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
      {error && <div className="tw-alert-error">{error}</div>}

      <label className="tw-label">
        Email address
        <input
          autoComplete="email"
          className="tw-input"
          defaultValue={defaultEmail}
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
      </label>

      <div className="grid gap-2">
        <label className="tw-label">
          Password
          <div className="relative">
            <input
              autoComplete="current-password"
              className="tw-input pr-24"
              defaultValue={defaultPassword}
              name="password"
              placeholder="Enter your password"
              required
              type={showPassword ? "text" : "password"}
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-3 my-auto rounded-lg px-2 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-orange-700"
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        <div className="flex justify-end">
          <Link
            className="text-sm font-bold text-orange-700 hover:text-orange-800"
            href="/forgot-password"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <button
        className="tw-btn-primary w-full"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Logging in..." : "Login to TriWheel"}
      </button>
    </form>
  );
}
