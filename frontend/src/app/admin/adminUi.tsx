"use client";

import { resolveMediaUrl } from "@/lib/api";
export function statusClass(status: string) {
  if (["approved", "completed", "online", "verified"].includes(status)) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (["pending", "requested", "ongoing", "accepted"].includes(status)) {
    return "bg-amber-100 text-amber-700";
  }

  if (["rejected", "cancelled", "offline", "unverified"].includes(status)) {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}

export function AdminPageHeader({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <header className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-800 p-5 text-white shadow-lg sm:p-8">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-200">
          Admin Module
        </p>
        <h1 className="mt-3 text-2xl font-black leading-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
          {description}
        </p>
      </div>
    </header>
  );
}

export function AdminDocumentRow({
  label,
  url,
}: {
  label: string;
  url: string | null | undefined;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
      <span className="text-xs font-bold text-slate-600 sm:text-sm">{label}</span>
      {url ? (
        <a
          className="rounded-lg bg-sky-100 px-2.5 py-1 text-[10px] font-black uppercase text-sky-700 transition hover:bg-sky-200 sm:text-xs"
          href={resolveMediaUrl(url) ?? url}
          rel="noopener noreferrer"
          target="_blank"
        >
          View
        </a>
      ) : (
        <span className={`rounded-full px-2 py-1 text-[10px] font-black ${statusClass("rejected")}`}>
          Missing
        </span>
      )}
    </div>
  );
}
