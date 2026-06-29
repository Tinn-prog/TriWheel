"use client";

import type { CancelReasonCode } from "@/lib/rideCancellation";
import { useState } from "react";

export function RideCancelDialog<TCode extends CancelReasonCode>({
  confirmLabel = "Cancel Ride",
  description,
  detailPlaceholder = "Tell them why you are cancelling...",
  isOpen,
  isSubmitting,
  onClose,
  onConfirm,
  reasons,
  title,
}: {
  confirmLabel?: string;
  description: string;
  detailPlaceholder?: string;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    cancellation_reason_code: TCode;
    cancellation_reason_detail?: string;
  }) => void;
  reasons: readonly { code: TCode; label: string }[];
  title: string;
}) {
  const [reasonCode, setReasonCode] = useState<TCode>(reasons[0].code);
  const [reasonDetail, setReasonDetail] = useState("");

  if (!isOpen) {
    return null;
  }

  function handleClose() {
    setReasonCode(reasons[0].code);
    setReasonDetail("");
    onClose();
  }

  function handleConfirm() {
    onConfirm({
      cancellation_reason_code: reasonCode,
      cancellation_reason_detail:
        reasonCode === "other" ? reasonDetail.trim() : undefined,
    });
  }

  const needsDetail = reasonCode === "other";
  const canConfirm = !needsDetail || reasonDetail.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[1200] overflow-y-auto bg-slate-950/70 p-4">
      <div className="flex min-h-full items-center justify-center">
        <div
          aria-modal="true"
          className="flex max-h-[min(90dvh,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-slate-200"
          role="dialog"
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">
              Cancel Ride
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

            <div className="mt-5 grid gap-2">
              {reasons.map((reason) => (
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                    reasonCode === reason.code
                      ? "border-orange-300 bg-orange-50"
                      : "border-slate-200 bg-white"
                  }`}
                  key={reason.code}
                >
                  <input
                    checked={reasonCode === reason.code}
                    className="size-4 accent-orange-500"
                    disabled={isSubmitting}
                    name="cancel-reason"
                    onChange={() => setReasonCode(reason.code)}
                    type="radio"
                    value={reason.code}
                  />
                  <span className="font-semibold text-slate-800">{reason.label}</span>
                </label>
              ))}
            </div>

            {needsDetail ? (
              <textarea
                className="mt-4 min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-orange-500 focus:ring-2"
                disabled={isSubmitting}
                onChange={(event) => setReasonDetail(event.target.value)}
                placeholder={detailPlaceholder}
                value={reasonDetail}
              />
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
            <button
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700"
              disabled={isSubmitting}
              onClick={handleClose}
              type="button"
            >
              Keep Ride
            </button>
            <button
              className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isSubmitting || !canConfirm}
              onClick={handleConfirm}
              type="button"
            >
              {isSubmitting ? "Cancelling..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
