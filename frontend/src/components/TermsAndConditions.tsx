"use client";

import { TERMS_LAST_UPDATED, TERMS_SECTIONS } from "@/lib/termsContent";
import Link from "next/link";

export function TermsDocument({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-5 text-sm leading-7 text-slate-700 ${className}`}>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
        Last updated {TERMS_LAST_UPDATED}
      </p>
      <p>
        These Terms and Conditions govern your use of the TriWheel platform as a
        passenger, driver, or applicant. Please read them carefully before creating
        an account.
      </p>
      {TERMS_SECTIONS.map((section) => (
        <section key={section.title}>
          <h3 className="text-base font-black text-slate-900">{section.title}</h3>
          <p className="mt-2">{section.body}</p>
        </section>
      ))}
    </div>
  );
}

export function TermsAndConditionsModal({
  onClose,
  open,
}: {
  onClose: () => void;
  open: boolean;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close terms dialog"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />
      <div
        aria-labelledby="terms-dialog-title"
        aria-modal="true"
        className="relative flex max-h-[min(90vh,48rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
        role="dialog"
      >
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            TriWheel
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-900" id="terms-dialog-title">
            Terms and Conditions
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Review the full terms before accepting and creating your account.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <TermsDocument />
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link
            className="text-center text-xs font-bold text-orange-700 hover:text-orange-800 sm:text-left"
            href="/terms"
            target="_blank"
          >
            Open full page
          </Link>
          <button
            className="tw-btn-primary min-h-11 px-5 py-2.5 text-sm"
            onClick={onClose}
            type="button"
          >
            I have read the Terms
          </button>
        </div>
      </div>
    </div>
  );
}

export function TermsAcceptanceField({
  checkboxName = "terms_accepted",
  disabled = false,
  hasViewedTerms,
  onOpenTerms,
  termsAccepted,
  onTermsAcceptedChange,
}: {
  checkboxName?: string;
  disabled?: boolean;
  hasViewedTerms: boolean;
  onOpenTerms: () => void;
  termsAccepted: boolean;
  onTermsAcceptedChange: (accepted: boolean) => void;
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-slate-900">Terms and Conditions</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            You must review the Terms and Conditions before creating an account.
          </p>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-black text-orange-700 transition hover:border-orange-300 hover:bg-orange-100"
          onClick={onOpenTerms}
          type="button"
        >
          {hasViewedTerms ? "View again" : "View Terms and Conditions"}
        </button>
      </div>

      <label className="flex gap-3 text-sm font-bold leading-6 text-slate-700">
        <input
          checked={termsAccepted}
          className="mt-1 size-4 disabled:cursor-not-allowed"
          disabled={disabled || !hasViewedTerms}
          name={checkboxName}
          onChange={(event) => onTermsAcceptedChange(event.target.checked)}
          required
          type="checkbox"
          value="1"
        />
        <span>
          I have read and agree to the{" "}
          <button
            className="font-black text-orange-700 underline decoration-orange-300 underline-offset-2"
            onClick={onOpenTerms}
            type="button"
          >
            Terms and Conditions
          </button>
          .
          {!hasViewedTerms ? (
            <span className="mt-1 block text-xs font-semibold text-amber-700">
              Open the terms above before you can proceed.
            </span>
          ) : null}
        </span>
      </label>
    </div>
  );
}
