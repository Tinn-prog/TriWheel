"use client";

import { useState } from "react";

export function AdminRejectDialog({
  confirmLabel,
  description,
  isOpen,
  isSubmitting,
  onClose,
  onConfirm,
  title,
}: {
  confirmLabel?: string;
  description: string;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
}) {
  const [reason, setReason] = useState("");

  if (!isOpen) {
    return null;
  }

  function handleClose() {
    setReason("");
    onClose();
  }

  function handleConfirm() {
    const trimmed = reason.trim();

    if (!trimmed) {
      return;
    }

    onConfirm(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl ring-1 ring-slate-200" role="dialog">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">
          Action Required
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

        <textarea
          className="mt-5 min-h-32 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-orange-500 focus:ring-2"
          disabled={isSubmitting}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Enter a clear reason..."
          value={reason}
        />

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700"
            disabled={isSubmitting}
            onClick={handleClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={isSubmitting || !reason.trim()}
            onClick={handleConfirm}
            type="button"
          >
            {isSubmitting ? "Saving..." : (confirmLabel ?? "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
