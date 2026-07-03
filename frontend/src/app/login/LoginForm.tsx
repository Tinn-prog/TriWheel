"use client";

import { type AdminPortal } from "@/lib/adminRoles";
import { apiFetch, apiRoutes } from "@/lib/api";
import {
  persistAuthSession,
  readRememberedEmail,
  readRememberMePreference,
  saveRememberMePreference,
} from "@/lib/authStorage";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

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
  portal,
}: {
  defaultEmail?: string;
  defaultPassword?: string;
  portal?: AdminPortal;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [resendNotice, setResendNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    setRememberMe(readRememberMePreference());

    if (!defaultEmail) {
      const rememberedEmail = readRememberedEmail();
      if (rememberedEmail) {
        setEmail(rememberedEmail);
      }
    }
  }, [defaultEmail]);

  async function handleResendVerification() {
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    setError("");
    setResendNotice("");
    setIsResending(true);

    try {
      const response = await apiFetch(apiRoutes.resendEmailVerification, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to resend verification email.");
      }

      setResendNotice(data.message ?? "Verification email sent.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to resend verification email.",
      );
    } finally {
      setIsResending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResendNotice("");
    setNeedsVerification(false);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const remember = formData.get("remember") === "on";

    try {
      const response = await apiFetch(apiRoutes.login, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          remember,
          ...(portal ? { portal } : {}),
        }),
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
        const message = firstError ?? validation.message ?? "Login failed.";

        if (message.toLowerCase().includes("verify your email")) {
          setNeedsVerification(true);
        }

        throw new Error(message);
      }

      const loginData = data as LoginResponse;
      persistAuthSession(loginData.user, loginData.token, remember);
      saveRememberMePreference(remember, email);
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
      {resendNotice ? <div className="tw-alert-success">{resendNotice}</div> : null}

      {needsVerification ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-black">Email verification required</p>
          <p className="mt-2 leading-6">
            Check your inbox for the verification link, or resend it below.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              className="tw-btn-secondary min-h-10 px-4 py-2 text-sm"
              disabled={isResending}
              onClick={() => void handleResendVerification()}
              type="button"
            >
              {isResending ? "Sending..." : "Resend verification email"}
            </button>
            <Link
              className="tw-btn-secondary min-h-10 px-4 py-2 text-center text-sm"
              href={`/verify-email?email=${encodeURIComponent(email)}`}
            >
              Open verification page
            </Link>
          </div>
        </div>
      ) : null}

      <label className="tw-label">
        Email address
        <input
          autoComplete="email"
          className="tw-input"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
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
        <div className="flex items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              checked={rememberMe}
              className="size-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
              name="remember"
              onChange={(event) => setRememberMe(event.target.checked)}
              type="checkbox"
            />
            Remember me
          </label>
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
