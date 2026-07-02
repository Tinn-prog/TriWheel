"use client";

import { apiFetch, apiRoutes } from "@/lib/api";
import {
  TermsAcceptanceField,
  TermsAndConditionsModal,
} from "@/components/TermsAndConditions";
import { PasswordRequirements } from "@/components/PasswordRequirements";
import { TriWheelLogo } from "@/components/TriWheelLogo";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function DriverRegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [hasViewedTerms, setHasViewedTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

    if (!termsAccepted) {
      setError("Please read and accept the Terms and Conditions before submitting your application.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await apiFetch(apiRoutes.driverRegister, {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (!response.ok) {
        const firstValidationError = data.errors
          ? Object.values(data.errors).flat()[0]
          : null;
        throw new Error(
          firstValidationError ?? data.message ?? "Unable to submit driver application.",
        );
      }

      const email = String(formData.get("email") ?? "");
      const params = new URLSearchParams({
        role: "driver",
        registered: "1",
        verify: "1",
      });

      if (email) {
        params.set("email", email);
      }

      router.replace(`/login?${params.toString()}`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to submit driver application.",
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
      <Image
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-[min(82vw,820px)] -translate-x-1/2 -translate-y-1/2 opacity-10 blur-[1px] drop-shadow-[0_35px_90px_rgba(0,0,0,0.65)] object-contain"
        height={820}
        priority
        src="/triwheel-brand-logo-v2.png"
        width={820}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0)_40%,_rgba(0,0,0,0.55))]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col sm:min-h-[calc(100vh-5rem)]">
        <Link
          className="mb-4 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-white/90 transition hover:text-white"
          href="/"
        >
          <span aria-hidden="true">←</span>
          Back to Home
        </Link>

        <div className="flex flex-1 items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-black/40 ring-1 ring-white/10 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="bg-gradient-to-br from-orange-700 via-orange-800 to-orange-950 p-5 text-white sm:p-12">
            <TriWheelLogo href="/" size="lg" wordmarkClassName="text-white" />

            <div className="mt-8 sm:mt-12">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-200/90">
                Driver registration
              </p>
              <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
                Apply to drive with TriWheel.
              </h1>
              <p className="mt-5 max-w-md text-orange-100/90">
                Create a driver account and submit your documents for admin
                verification before receiving ride requests.
              </p>
            </div>
          </section>

          <section className="bg-slate-50 p-5 text-slate-900 sm:p-10 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:p-12">
            <h2 className="text-2xl font-bold sm:text-3xl">Driver Registration</h2>
            <p className="mt-2 text-base leading-7 text-slate-700">
              Complete your account, license, and vehicle details for review.
            </p>

            {error && (
              <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
                {error}
              </div>
            )}

            <form className="mt-8 grid gap-6" onSubmit={handleSubmit}>
              <input name="role" type="hidden" value="driver" />
              <input name="approval_status" type="hidden" value="pending" />

              <fieldset className="grid gap-5">
                <legend className="text-lg font-black">Account Details</legend>
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
                  Middle name{" "}
                  <span className="font-normal text-slate-500">(optional)</span>
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
                      placeholder="10 to 15 digit mobile number"
                      required
                      type="tel"
                    />
                  </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold sm:col-span-2">
                    Password
                    <input
                      autoComplete="new-password"
                      className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      minLength={6}
                      name="password"
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Create your password"
                      required
                      type="password"
                      value={password}
                    />
                  </label>

                  <div className="sm:col-span-2">
                    <PasswordRequirements
                      confirmPassword={confirmPassword}
                      password={password}
                    />
                  </div>

                  <label className="grid gap-2 text-sm font-bold sm:col-span-2">
                    Confirm password
                    <input
                      autoComplete="new-password"
                      className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      minLength={6}
                      name="password_confirmation"
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Confirm your password"
                      required
                      type="password"
                      value={confirmPassword}
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="grid gap-5 border-t border-slate-100 pt-6">
                <legend className="text-lg font-black">Driver Verification</legend>
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
                    License number
                    <input
                      className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      name="license_number"
                      placeholder="Enter license number"
                      required
                      type="text"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-bold">
                    License expiry date
                    <input
                      className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      name="license_expiry_date"
                      required
                      type="date"
                    />
                  </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold">
                    License restriction/code
                    <input
                      className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      name="license_restriction"
                      placeholder="Example: A, A1, B, B1"
                      required
                      type="text"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-bold">
                    Driver phone number
                    <input
                      className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      inputMode="numeric"
                      name="phone"
                      pattern="[0-9]{10,15}"
                      placeholder="10 to 15 digit phone number"
                      required
                      type="tel"
                    />
                  </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold">
                    License document
                    <input
                      accept=".pdf,image/png,image/jpeg"
                      className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-normal file:mr-4 file:rounded-xl file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:font-bold file:text-orange-700"
                      name="license_doc"
                      required
                      type="file"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-bold">
                    TODA ID document
                    <input
                      accept=".pdf,image/png,image/jpeg"
                      className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-normal file:mr-4 file:rounded-xl file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:font-bold file:text-orange-700"
                      name="toda_id_doc"
                      required
                      type="file"
                    />
                  </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold">
                    TODA ID number{" "}
                    <span className="font-normal text-slate-500">(if issued)</span>
                    <input
                      className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      name="toda_id_number"
                      placeholder="Enter TODA ID number"
                      type="text"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-bold">
                    TODA / terminal association
                    <input
                      className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      name="toda_association"
                      placeholder="Association or terminal name"
                      required
                      type="text"
                    />
                  </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold">
                    LGU (city / municipality)
                    <input
                      className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      name="lgu"
                      placeholder="e.g. Quezon City, Manila"
                      required
                      type="text"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-bold">
                    MTOP / franchise number
                    <input
                      className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      name="mtop_number"
                      placeholder="MTOP or franchise permit number"
                      required
                      type="text"
                    />
                  </label>
                </div>

                <label className="grid gap-2 text-sm font-bold">
                  Franchise / route permit{" "}
                  <span className="font-normal text-slate-500">(optional if not applicable)</span>
                  <input
                    accept=".pdf,image/png,image/jpeg"
                    className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-normal file:mr-4 file:rounded-xl file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:font-bold file:text-orange-700"
                    name="franchise_permit_file"
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
              </fieldset>

              <fieldset className="grid gap-5 border-t border-slate-100 pt-6">
                <legend className="text-lg font-black">Vehicle Information</legend>
                <div className="grid gap-5 sm:grid-cols-3">
                  <label className="grid gap-2 text-sm font-bold">
                    Vehicle type
                    <select
                      className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      defaultValue="tricycle"
                      name="vehicle_type"
                      required
                    >
                      <option value="tricycle">Tricycle</option>
                      <option value="pedicab">Pedicab</option>
                      <option value="e-tricycle">E-tricycle</option>
                    </select>
                  </label>

                  <label className="grid gap-2 text-sm font-bold">
                    Plate number
                    <input
                      className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      name="plate_number"
                      placeholder="Plate number"
                      required
                      type="text"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-bold">
                    Body number{" "}
                    <span className="font-normal text-slate-500">(if any)</span>
                    <input
                      className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      name="body_number"
                      placeholder="Body number"
                      type="text"
                    />
                  </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold">
                    Vehicle color
                    <input
                      className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      name="color"
                      placeholder="Vehicle color"
                      required
                      type="text"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-bold">
                    Registration expiry date
                    <input
                      className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      name="registration_expiry_date"
                      required
                      type="date"
                    />
                  </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold">
                    Vehicle photo
                    <input
                      accept="image/png,image/jpeg"
                      className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-normal file:mr-4 file:rounded-xl file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:font-bold file:text-orange-700"
                      name="vehicle_photo"
                      required
                      type="file"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-bold">
                    OR/CR document
                    <input
                      accept=".pdf,image/png,image/jpeg"
                      className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-normal file:mr-4 file:rounded-xl file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:font-bold file:text-orange-700"
                      name="orcr_file"
                      required
                      type="file"
                    />
                  </label>
                </div>
              </fieldset>

              <TermsAcceptanceField
                hasViewedTerms={hasViewedTerms}
                onOpenTerms={() => setShowTerms(true)}
                onTermsAcceptedChange={setTermsAccepted}
                termsAccepted={termsAccepted}
              />

              <fieldset className="grid gap-4 border-t border-slate-100 pt-6">
                <legend className="text-lg font-black">Safety Agreement</legend>
                <label className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold leading-6">
                  <input
                    className="mt-1 size-4"
                    name="background_check_consent"
                    required
                    type="checkbox"
                    value="1"
                  />
                  I consent to TriWheel reviewing my submitted identity, license,
                  and vehicle documents for safety verification.
                </label>
                <label className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold leading-6">
                  <input
                    className="mt-1 size-4"
                    name="platform_rules_accepted"
                    required
                    type="checkbox"
                    value="1"
                  />
                  I agree to follow TriWheel platform rules, road safety practices,
                  and admin verification decisions.
                </label>
              </fieldset>

              <div className="rounded-2xl bg-orange-50 p-4 text-sm leading-6 text-orange-900">
                Driver applications are saved as pending until an admin reviews
                the submitted documents.
              </div>

              <button
                className="rounded-2xl bg-orange-500 px-6 py-4 font-black text-white shadow-xl shadow-orange-500/25 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                disabled={isSubmitting || !termsAccepted}
                type="submit"
              >
                {isSubmitting ? "Submitting Application..." : "Submit Driver Application"}
              </button>

              <p className="text-center text-sm text-slate-600">
                Already approved?{" "}
                <Link
                  className="font-bold text-orange-600"
                  href="/login?role=driver"
                >
                  Login as Driver
                </Link>
              </p>
            </form>
          </section>
        </div>
        </div>
      </div>

      <TermsAndConditionsModal
        onClose={() => {
          setShowTerms(false);
          setHasViewedTerms(true);
        }}
        open={showTerms}
      />
    </main>
  );
}
