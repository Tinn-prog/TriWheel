"use client";

import { apiFetch, apiRoutes } from "@/lib/api";
import { formatDateTime } from "@/lib/formatDateTime";
import { FormEvent, useState } from "react";

export type RestoreAppealState = {
  can_submit: boolean;
  appeal_submitted: boolean;
  appeal_message: string | null;
  appeal_submitted_at: string | null;
  deletion_reason: string | null;
  deleted_at: string | null;
  purge_at: string | null;
  retention_months: number;
};

export function AccountRestoreAppealPanel({
  email,
  password,
  restoreAppeal,
  userName,
  onAppealSubmitted,
}: {
  email: string;
  password: string;
  restoreAppeal: RestoreAppealState;
  userName: string;
  onAppealSubmitted: (next: RestoreAppealState) => void;
}) {
  const [appealMessage, setAppealMessage] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appeal, setAppeal] = useState(restoreAppeal);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      const response = await apiFetch(apiRoutes.accountRestoreAppeal, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          message: appealMessage.trim(),
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        restore_appeal?: RestoreAppealState;
      };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to submit restore appeal.");
      }

      const next = data.restore_appeal ?? {
        ...appeal,
        can_submit: false,
        appeal_submitted: true,
        appeal_message: appealMessage.trim(),
        appeal_submitted_at: new Date().toISOString(),
      };

      setAppeal(next);
      onAppealSubmitted(next);
      setNotice(data.message ?? "Restore appeal submitted.");
      setAppealMessage("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to submit restore appeal.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-6 rounded-[2rem] border border-red-200 bg-white p-5 shadow-sm ring-1 ring-red-100 sm:p-6">
      <div className="rounded-2xl bg-red-50 px-4 py-3 text-red-800">
        <p className="text-xs font-black uppercase tracking-[0.2em]">Account Deleted</p>
        <h2 className="mt-2 text-xl font-black sm:text-2xl">
          {userName}, your account was deleted.
        </h2>
        <p className="mt-2 text-sm leading-6">
          <span className="font-bold">Reason:</span> {appeal.deletion_reason || "No reason provided."}
        </p>
        <p className="mt-1 text-sm leading-6">
          It stays recoverable for about {appeal.retention_months || 3} months
          {appeal.purge_at ? ` (until ${formatDateTime(appeal.purge_at)})` : ""}. You can appeal
          for restoration below.
        </p>
      </div>

      {appeal.appeal_submitted ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-900">
          <p className="text-sm font-black">Restore appeal submitted</p>
          <p className="mt-2 text-sm leading-6">
            Your appeal was sent
            {appeal.appeal_submitted_at
              ? ` on ${formatDateTime(appeal.appeal_submitted_at)}`
              : ""}
            . A Super Admin will review it. You cannot use TriWheel until the account is
            restored.
          </p>
          {appeal.appeal_message ? (
            <p className="mt-3 rounded-xl bg-white/80 px-3 py-3 text-sm leading-6 text-slate-700">
              {appeal.appeal_message}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-5">
          <p className="text-sm leading-6 text-slate-600">
            Explain why your account should be restored. Super Admin will see this under Deleted
            Accounts.
          </p>

          {error ? <div className="tw-alert-error mt-4">{error}</div> : null}
          {notice ? <div className="tw-alert-success mt-4">{notice}</div> : null}

          <form className="mt-5 grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
            <label className="tw-label">
              Your restore appeal
              <textarea
                className="tw-input min-h-36 resize-y"
                minLength={20}
                onChange={(event) => setAppealMessage(event.target.value)}
                placeholder="Explain why your account should be restored. Include any context that helps Super Admin review your case."
                required
                value={appealMessage}
              />
            </label>
            <button
              className="tw-btn-primary w-full sm:w-fit"
              disabled={isSubmitting || !appeal.can_submit}
              type="submit"
            >
              {isSubmitting ? "Submitting appeal..." : "Submit Restore Appeal"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
