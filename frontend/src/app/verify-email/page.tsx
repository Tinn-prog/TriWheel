"use client";

import { apiFetch, apiRoutes } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verifiedRole, setVerifiedRole] = useState<"passenger" | "driver" | null>(null);

  async function verifyToken(currentToken: string) {
    if (!currentToken) {
      return;
    }

    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      const response = await apiFetch(apiRoutes.verifyEmail, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: currentToken }),
      });
      const data = (await response.json()) as {
        message?: string;
        role?: "passenger" | "driver" | "admin";
      };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to verify email.");
      }

      setVerifiedRole(data.role === "driver" ? "driver" : "passenger");
      setNotice(data.message ?? "Email verified successfully.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to verify email.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (token) {
      void verifyToken(token);
    }
  }, [token]);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await verifyToken(token);
  }

  async function handleResend() {
    if (!email.trim()) {
      setError("Enter your email address to resend the verification link.");
      return;
    }

    setError("");
    setNotice("");
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

      setNotice(data.message ?? "Verification email sent.");
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

  const loginHref =
    verifiedRole === "driver" ? "/login?role=driver" : "/login?role=passenger";

  return (
    <section className="bg-slate-50 p-6 text-slate-900 sm:p-8">
      {error ? <div className="tw-alert-error">{error}</div> : null}
      {notice ? <div className="tw-alert-success mb-5">{notice}</div> : null}

      {verifiedRole ? (
        <div className="grid gap-4">
          <p className="text-sm leading-7 text-slate-600">
            Your email address is verified. You can now sign in to TriWheel.
          </p>
          <button
            className="tw-btn-primary"
            onClick={() => router.push(loginHref)}
            type="button"
          >
            Go to Login
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          <form className="grid gap-4" onSubmit={handleVerify}>
            <p className="text-sm leading-7 text-slate-600">
              {token
                ? "Tap verify below to confirm your email address."
                : "Open the verification link from your email, or request a new one below."}
            </p>
            {token ? (
              <button
                className="tw-btn-primary"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Verifying..." : "Verify Email"}
              </button>
            ) : null}
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-black text-slate-900">Resend verification email</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Did not receive the email? Enter your registered address and we will
              send a new link.
            </p>
            <label className="mt-4 grid gap-2 text-sm font-bold">
              Email address
              <input
                autoComplete="email"
                className="tw-input"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                value={email}
              />
            </label>
            <button
              className="tw-btn-secondary mt-4 w-full"
              disabled={isResending}
              onClick={() => void handleResend()}
              type="button"
            >
              {isResending ? "Sending..." : "Resend Verification Email"}
            </button>
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-slate-600">
        <Link className="font-bold text-orange-700 hover:text-orange-800" href="/login">
          Back to Login
        </Link>
      </p>
    </section>
  );
}

export default function VerifyEmailPage() {
  return (
    <main
      className="relative min-h-screen overflow-x-hidden px-4 py-6 text-white sm:px-6 sm:py-10"
      style={{ background: "var(--auth-bg)" }}
    >
      <Image
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-auto w-[min(82vw,820px)] -translate-x-1/2 -translate-y-1/2 opacity-10 blur-[1px]"
        height={576}
        priority
        src="/triwheel-brand-logo-v2.png"
        width={1024}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0)_40%,_rgba(0,0,0,0.55))]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-black/40 ring-1 ring-white/10">
          <div className="bg-gradient-to-br from-orange-700 via-orange-800 to-orange-950 p-6 text-white sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-200/90">
              Account security
            </p>
            <h1 className="mt-3 text-3xl font-black">Verify your email</h1>
            <p className="mt-3 text-sm leading-6 text-orange-100/90">
              Email verification helps protect your TriWheel account.
            </p>
          </div>
          <Suspense
            fallback={
              <section className="bg-slate-50 p-6 text-sm font-semibold text-slate-600 sm:p-8">
                Loading verification...
              </section>
            }
          >
            <VerifyEmailForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
