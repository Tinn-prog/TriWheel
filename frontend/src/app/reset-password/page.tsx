"use client";

import { apiFetch, apiRoutes } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("This reset link is missing a token. Please request a new password reset.");
      return;
    }

    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      const response = await apiFetch(apiRoutes.resetPassword, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to reset password.");
      }

      setNotice(data.message ?? "Password updated successfully.");
      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to reset password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="bg-slate-50 p-6 text-slate-900 sm:p-8">
      {!token ? (
        <div className="tw-alert-error">
          This reset link is invalid.{" "}
          <Link className="font-bold underline" href="/forgot-password">
            Request a new one
          </Link>
          .
        </div>
      ) : null}

      {error ? <div className="tw-alert-error">{error}</div> : null}
      {notice ? <div className="tw-alert-success mb-5">{notice}</div> : null}

      <form className="grid gap-5" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">New password</span>
          <div className="relative">
            <input
              autoComplete="new-password"
              className="tw-input pr-24"
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              required
              type={showPassword ? "text" : "password"}
              value={password}
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
        </div>

        <div className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Confirm password</span>
          <div className="relative">
            <input
              autoComplete="new-password"
              className="tw-input pr-24"
              minLength={6}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              required
              type={showConfirmPassword ? "text" : "password"}
              value={passwordConfirmation}
            />
            <button
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-3 my-auto rounded-lg px-2 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-orange-700"
              onClick={() => setShowConfirmPassword((current) => !current)}
              type="button"
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <button
          className="tw-btn-primary w-full"
          disabled={isSubmitting || !token}
          type="submit"
        >
          {isSubmitting ? "Saving..." : "Update Password"}
        </button>
      </form>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <main
      className="relative min-h-screen overflow-x-hidden px-4 py-6 text-white sm:px-6 sm:py-10"
      style={{ background: "var(--auth-bg)" }}
    >
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col sm:min-h-[calc(100vh-5rem)]">
        <Link
          className="mb-4 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-white/90 transition hover:text-white"
          href="/login"
        >
          <span aria-hidden="true">←</span>
          Back to Login
        </Link>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-black/40 ring-1 ring-white/10">
            <section className="bg-gradient-to-br from-orange-700 via-orange-800 to-orange-950 p-6 text-white sm:p-8">
              <div className="inline-flex items-center gap-3">
                <span className="relative h-10 w-20 overflow-hidden rounded-xl bg-black">
                  <Image
                    alt="TriWheel logo"
                    className="object-contain p-1"
                    fill
                    sizes="80px"
                    src="/triwheel-brand-logo-v2.png"
                  />
                </span>
                <span className="text-xl font-black">TriWheel</span>
              </div>
              <h1 className="mt-6 text-3xl font-black">Choose a new password</h1>
              <p className="mt-3 text-orange-100/90">
                Enter and confirm your new password to finish resetting your account.
              </p>
            </section>

            <Suspense fallback={<section className="bg-slate-50 p-6 sm:p-8">Loading...</section>}>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}
