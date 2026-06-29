"use client";

type ConfirmDialogProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  isConfirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
  tone?: "default" | "danger";
};

export function ConfirmDialog({
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  description,
  isConfirming = false,
  onCancel,
  onConfirm,
  open,
  title,
  tone = "default",
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
        disabled={isConfirming}
        onClick={onCancel}
        type="button"
      />
      <div
        aria-labelledby="confirm-dialog-title"
        aria-modal="true"
        className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-200 sm:p-6"
        role="dialog"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          TriWheel
        </p>
        <h2 className="mt-2 text-xl font-black text-slate-900" id="confirm-dialog-title">
          {title}
        </h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="tw-btn-secondary min-h-11 px-4 py-2.5 text-sm"
            disabled={isConfirming}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`min-h-11 px-4 py-2.5 text-sm ${
              tone === "danger" ? "tw-btn-danger" : "tw-btn-primary"
            }`}
            disabled={isConfirming}
            onClick={onConfirm}
            type="button"
          >
            {isConfirming ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
