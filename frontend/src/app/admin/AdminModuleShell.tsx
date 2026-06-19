"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { AdminAccessGate } from "./AdminAccessGate";

const adminNavItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/drivers", label: "Drivers" },
  { href: "/admin/passengers", label: "Passengers" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/rides", label: "Rides" },
  { href: "/admin/settings", label: "Settings" },
];

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

export function AdminModuleShell({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <AdminAccessGate>
      <main className="min-h-screen overflow-x-hidden bg-slate-100 px-4 py-5 text-slate-950 sm:px-6 sm:py-8">
        <section className="mx-auto w-full max-w-7xl">
          <header className="rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-slate-900 to-orange-800 p-5 text-white shadow-xl shadow-slate-200 sm:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-200">
                  Admin Module
                </p>
                <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
                  {title}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
                  {description}
                </p>
              </div>
              <Link
                className="inline-flex w-fit rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-slate-950"
                href="/admin"
              >
                Back to Overview
              </Link>
            </div>
          </header>

          <nav className="mt-5 flex gap-2 overflow-x-auto rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
            {adminNavItems.map((item) => (
              <Link
                className="shrink-0 rounded-2xl px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-orange-50 hover:text-orange-700"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {children}
        </section>
      </main>
    </AdminAccessGate>
  );
}
