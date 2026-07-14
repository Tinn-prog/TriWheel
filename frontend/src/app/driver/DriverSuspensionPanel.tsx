"use client";

import { apiRoutes } from "@/lib/api";
import { formatDateTime } from "@/lib/formatDateTime";
import { FormEvent, useEffect, useState } from "react";
import type { DriverSuspensionState } from "./driverTypes";

function formatDeadline(deadline: string | null) {
  return formatDateTime(deadline);
}

function useCountdown(deadline: string | null, active: boolean) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!deadline || !active) {
      setRemaining("");
      return;
    }

    const deadlineAt = deadline;

    function tick() {
      const ms = new Date(deadlineAt).getTime() - Date.now();

      if (ms <= 0) {
        setRemaining("0h 0m");
        return;
      }

      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      setRemaining(`${hours}h ${minutes}m`);
    }

    tick();
    const interval = window.setInterval(tick, 60_000);

    return () => window.clearInterval(interval);
  }, [active, deadline]);

  return remaining;
}

export function DriverSuspensionPanel({
  driverName,
  onAppealSubmitted,
  suspension,
  userId,
}: {
  driverName: string;
  onAppealSubmitted: () => Promise<void>;
  suspension: DriverSuspensionState;
  userId: number;
}) {
  const [appealMessage, setAppealMessage] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const countdown = useCountdown(
    suspension.appeal_deadline_at,
    suspension.can_submit_appeal,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      const response = await fetch(apiRoutes.driverSuspensionAppeal, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          message: appealMessage.trim(),
        }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to submit appeal.");
      }

      setNotice(data.message ?? "Appeal submitted successfully.");
      setAppealMessage("");
      await onAppealSubmitted();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to submit appeal.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-6 rounded-[2rem] border border-red-200 bg-white p-5 shadow-sm ring-1 ring-red-100 sm:p-8">
      <div className="rounded-2xl bg-red-50 px-4 py-3 text-red-800">
        <p className="text-xs font-black uppercase tracking-[0.2em]">
          Account Suspended
        </p>
        <h2 className="mt-2 text-2xl font-black">
          {driverName}, your driver account is suspended.
        </h2>
        <p className="mt-2 text-sm leading-6">
          <span className="font-bold">Reason:</span>{" "}
          {suspension.reason ?? "No reason provided."}
        </p>
      </div>

      {suspension.requires_office_visit || suspension.account_permanently_closed ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950">
          <p className="text-sm font-black">Appeal window closed</p>
          <p className="mt-2 text-sm leading-6">
            The 48-hour appeal period has ended without a submission. Your
            account is permanently closed on TriWheel. Please visit the TriWheel
            office in person with a valid ID to resolve your account.
          </p>
        </div>
      ) : suspension.appeal_submitted ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-900">
          <p className="text-sm font-black">Appeal submitted</p>
          <p className="mt-2 text-sm leading-6">
            Your appeal was sent on{" "}
            {formatDeadline(suspension.appeal_submitted_at)}. An admin will
            review it. You cannot use driver features until a decision is made.
          </p>
          {suspension.appeal_message ? (
            <p className="mt-3 rounded-xl bg-white/80 px-3 py-3 text-sm leading-6 text-slate-700">
              {suspension.appeal_message}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-5">
          <p className="text-sm leading-6 text-slate-600">
            You have{" "}
            <span className="font-black text-slate-900">
              {countdown || "limited time"}
            </span>{" "}
            left to submit an appeal. Until then, you can only send your appeal —
            going online, accepting rides, and other actions are disabled.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Deadline: {formatDeadline(suspension.appeal_deadline_at)}
          </p>

          {error ? <div className="tw-alert-error mt-4">{error}</div> : null}
          {notice ? <div className="tw-alert-success mt-4">{notice}</div> : null}

          <form className="mt-5 grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
            <label className="tw-label">
              Your appeal
              <textarea
                className="tw-input min-h-36 resize-y"
                minLength={20}
                onChange={(event) => setAppealMessage(event.target.value)}
                placeholder="Explain why your account should be reinstated. Include any context that helps admins review your case."
                required
                value={appealMessage}
              />
            </label>
            <button
              className="tw-btn-primary w-full sm:w-fit"
              disabled={isSubmitting || !suspension.can_submit_appeal}
              type="submit"
            >
              {isSubmitting ? "Submitting appeal..." : "Submit Appeal"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
