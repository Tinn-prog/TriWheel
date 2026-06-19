"use client";

import { apiRoutes } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function SignupPage() {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const benefits = [
    "Book tricycle rides faster",
    "Track active ride status",
    "View your ride history",
    "Connect with verified drivers",
  ];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("password_confirmation") ?? "");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      const response = await fetch(apiRoutes.passengerRegister, {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to create passenger account.");
      }

      setNotice(
        data.message ??
          "Passenger account submitted successfully. Please wait for admin verification.",
      );
      form.reset();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create passenger account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_#ffedd5_0%,_#fb923c_34%,_#7c2d12_68%,_#1c0f08_100%)] px-4 py-6 text-slate-950 sm:px-6 sm:py-10">
      <Image
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-auto w-[min(82vw,820px)] -translate-x-1/2 -translate-y-1/2 opacity-10 blur-[1px] drop-shadow-[0_35px_90px_rgba(0,0,0,0.65)]"
        height={576}
        priority
        src="/triwheel-brand-logo-v2.png"
        width={1024}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,_rgba(255,255,255,0.2),_rgba(255,255,255,0)_45%,_rgba(0,0,0,0.35))]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center sm:min-h-[calc(100vh-5rem)]">
        <div className="grid w-full overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-orange-950/35 ring-1 ring-white/30 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 p-5 text-white sm:p-12">
            <Link className="inline-flex items-center gap-3" href="/">
              <span className="relative h-12 w-24 overflow-hidden rounded-2xl bg-black shadow-lg shadow-orange-700/20">
                <Image
                  alt="TriWheel logo"
                  className="object-contain p-1"
                  fill
                  priority
                  sizes="96px"
                  src="/triwheel-brand-logo-v2.png"
                />
              </span>
              <span className="text-2xl font-black">TriWheel</span>
            </Link>

            <div className="mt-8 sm:mt-16">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-100">
                Passenger registration
              </p>
              <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
                Create your passenger account.
              </h1>
              <p className="mt-5 max-w-md text-orange-50">
                Join TriWheel to book local rides, track requests, and manage
                your ride history from one passenger dashboard.
              </p>

              <div className="mt-8 grid gap-3">
                {benefits.map((benefit) => (
                  <div
                    className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white"
                    key={benefit}
                  >
                    <span className="grid size-6 place-items-center rounded-full bg-white text-xs text-orange-600">
                      ✓
                    </span>
                    {benefit}
                  </div>
                ))}
              </div>
            </div>
            </section>

          <section className="p-5 text-slate-950 sm:p-12">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex w-fit rounded-full bg-orange-100 px-4 py-2 text-sm font-black text-orange-700">
                Passenger account
              </div>
              <Link
                className="inline-flex w-fit rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                href="/"
              >
                Back to Home
              </Link>
            </div>
            <h2 className="text-3xl font-black">Passenger Registration</h2>
            <p className="mt-2 text-slate-600">
              Fill in your details to create a passenger profile.
            </p>

            {error && (
              <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
                {error}
              </div>
            )}
            {notice && (
              <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                {notice}
              </div>
            )}

            <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
              <input name="role" type="hidden" value="passenger" />

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">
                  First name
                  <input
                    className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    name="first_name"
                    placeholder="Enter your first name"
                    required
                    type="text"
                  />
                </label>

                <label className="grid gap-2 text-sm font-bold">
                  Last name
                  <input
                    className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    name="last_name"
                    placeholder="Enter your last name"
                    required
                    type="text"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-bold">
                Middle name <span className="font-normal text-slate-500">(optional)</span>
                <input
                  className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  name="middle_name"
                  placeholder="Enter your middle name"
                  type="text"
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
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
                  Contact number
                  <input
                    autoComplete="tel"
                    className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    inputMode="numeric"
                    name="contact_number"
                    pattern="[0-9]{10,15}"
                    placeholder="Enter 10 to 15 digit mobile number"
                    required
                    type="tel"
                  />
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">
                  Birth date
                  <input
                    className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    name="date_of_birth"
                    required
                    type="date"
                  />
                </label>

                <label className="grid gap-2 text-sm font-bold">
                  Current address
                  <input
                    className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    name="current_address"
                    placeholder="House no., street, barangay, city"
                    required
                    type="text"
                  />
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">
                  Government ID type
                  <select
                    className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    name="government_id_type"
                    required
                  >
                    <option value="">Select ID type</option>
                    <option value="PhilSys ID">PhilSys ID</option>
                    <option value="Driver's License">Driver&apos;s License</option>
                    <option value="UMID">UMID</option>
                    <option value="Voter's ID">Voter&apos;s ID</option>
                    <option value="Barangay ID">Barangay ID</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-bold">
                  Profile photo
                  <input
                    accept="image/png,image/jpeg"
                    className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-normal file:mr-4 file:rounded-xl file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:font-bold file:text-orange-700"
                    name="profile_photo"
                    required
                    type="file"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-bold">
                Government ID document
                <input
                  accept=".pdf,image/png,image/jpeg"
                  className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-normal file:mr-4 file:rounded-xl file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:font-bold file:text-orange-700"
                  name="government_id_file"
                  required
                  type="file"
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">
                  Emergency contact name
                  <input
                    className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    name="emergency_contact_name"
                    placeholder="Full name"
                    required
                    type="text"
                  />
                </label>

                <label className="grid gap-2 text-sm font-bold">
                  Emergency contact number
                  <input
                    className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    inputMode="numeric"
                    name="emergency_contact_number"
                    pattern="[0-9]{10,15}"
                    placeholder="10 to 15 digit phone number"
                    required
                    type="tel"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-bold">
                Password
                <input
                  autoComplete="new-password"
                  className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  minLength={6}
                  name="password"
                  placeholder="Create a password, minimum 6 characters"
                  required
                  type="password"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold">
                Confirm password
                <input
                  autoComplete="new-password"
                  className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  minLength={6}
                  name="password_confirmation"
                  placeholder="Confirm your password"
                  required
                  type="password"
                />
              </label>

              <label className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold leading-6">
                <input
                  className="mt-1 size-4"
                  name="safety_terms_accepted"
                  required
                  type="checkbox"
                  value="1"
                />
                I agree to TriWheel safety rules and consent to admin verification
                of my submitted passenger identity details.
              </label>

              <button
                className="rounded-2xl bg-orange-500 px-6 py-4 font-black text-white shadow-xl shadow-orange-500/25 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Creating Account..." : "Create Passenger Account"}
              </button>

              <div className="grid gap-3 text-center text-sm text-slate-600">
                <p>
                  Want to drive instead?{" "}
                  <Link
                    className="font-bold text-orange-600"
                    href="/driver/register"
                  >
                    Apply as Driver
                  </Link>
                </p>
                <p>
                  Already have an account?{" "}
                  <Link
                    className="font-bold text-orange-600"
                    href="/login?role=passenger"
                  >
                    Login as Passenger
                  </Link>
                </p>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
