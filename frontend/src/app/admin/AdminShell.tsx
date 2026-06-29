"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { AdminUserPanel } from "./AdminUserPanel";
import { adminNavItems } from "./adminNav";

function isNavActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-white/10 bg-slate-950 text-white lg:flex">
        <div className="shrink-0 px-6 pt-6">
          <div>
            <Link className="text-2xl font-black" href="/admin">
              TriWheel
            </Link>
            <p className="mt-2 text-sm text-slate-400">Admin Control Center</p>
          </div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-6 py-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="grid gap-2 text-sm font-bold">
            {adminNavItems.map((item) => (
              <Link
                className={`rounded-2xl px-4 py-3 transition ${
                  isNavActive(pathname, item.href)
                    ? "bg-orange-500 text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="shrink-0 border-t border-white/10 px-6 py-4">
          <AdminUserPanel />
        </div>
      </aside>

      <section className="w-full min-w-0 px-4 py-5 sm:px-6 sm:py-8 lg:ml-72 lg:w-auto">
        <nav className="mb-4 flex items-center justify-between gap-3 lg:hidden">
          <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-2">
          {adminNavItems.map((item) => (
            <Link
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black ${
                isNavActive(pathname, item.href)
                  ? "bg-orange-500 text-white"
                  : "text-slate-600"
              }`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
            </div>
          </div>
        </nav>

        <div className="mb-4 lg:hidden">
          <AdminUserPanel />
        </div>

        {children}
      </section>
    </main>
  );
}
