"use client";

import { apiFetch, apiRoutes } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      const response = await apiFetch(apiRoutes.forgotPassword, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to send reset link.");
      }

      setNotice(
        data.message ??
          "If an account exists for that email, a password reset link has been sent.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to send reset link.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

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
              <h1 className="mt-6 text-3xl font-black">Forgot password?</h1>
              <p className="mt-3 text-orange-100/90">
                Enter your registered email and we&apos;ll send a reset link if an account
                exists.
              </p>
            </section>

            <section className="bg-slate-50 p-6 text-slate-900 sm:p-8">
              {error ? <div className="tw-alert-error">{error}</div> : null}
              {notice ? <div className="tw-alert-success mb-5">{notice}</div> : null}

              <form className="grid gap-5" onSubmit={handleSubmit}>
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

                <button
                  className="tw-btn-primary w-full"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
