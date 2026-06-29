"use client";

import { ReactNode } from "react";

export function AdminFilterBar({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:flex-row lg:flex-wrap lg:items-end">
      {children}
    </div>
  );
}

export function AdminFilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid min-w-[10rem] flex-1 gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
      {label}
      {children}
    </label>
  );
}

export function adminInputClass() {
  return "rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none ring-orange-500 focus:ring-2";
}

export function AdminExportButton({
  filename,
  label,
  onExport,
}: {
  filename: string;
  label: string;
  onExport: (filename: string) => Promise<void>;
}) {
  return (
    <button
      className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white"
      onClick={() => void onExport(filename)}
      type="button"
    >
      {label}
    </button>
  );
}
