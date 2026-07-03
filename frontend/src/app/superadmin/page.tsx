"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminGet, apiRoutes } from "@/lib/adminApi";
import { useStoredTriWheelSession } from "../admin/AdminAccessGate";

type AdminOverview = {
  stats: {
    users: {
      total: number;
      admins: number;
      drivers: number;
      passengers: number;
    };
    rides: {
      total: number;
      ongoing: number;
      completed: number;
      cancelled: number;
    };
  };
};

export default function SuperAdminOverviewPage() {
  const { user } = useStoredTriWheelSession();
  const [overview, setOverview] = useState<AdminOverview | null>(null);

  useEffect(() => {
    async function loadOverview() {
      try {
        const response = await adminGet(apiRoutes.adminOverview);
        const data = (await response.json()) as AdminOverview;
        if (response.ok) {
          setOverview(data);
        }
      } catch {
        setOverview(null);
      }
    }

    void loadOverview();
  }, []);

  const cards = [
    {
      href: "/superadmin/users",
      label: "User Accounts",
      value: overview?.stats.users.total ?? "—",
      detail: "Manage roles, admin access, and suspensions",
    },
    {
      href: "/superadmin/settings",
      label: "Platform Settings",
      value: "Config",
      detail: "Fares, restrictions, and operator permissions",
    },
    {
      href: "/superadmin/audit",
      label: "Audit Log",
      value: "Review",
      detail: "Track sensitive admin actions across the platform",
    },
    {
      href: "/superadmin/analytics",
      label: "Analytics & Exports",
      value: overview?.stats.rides.total ?? "—",
      detail: "Ratings, reports, and CSV exports",
    },
    {
      href: "/superadmin/operations",
      label: "Operations Console",
      value: overview?.stats.rides.ongoing ?? "—",
      detail: "Drivers, passengers, rides, and emergency response",
    },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl min-w-0">
      <header className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-red-700 via-red-800 to-[#1a0a0a] p-5 text-white shadow-xl shadow-red-200 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-red-100 sm:text-sm">
          Super Admin
        </p>
        <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
          Platform Governance
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-red-100/90 sm:text-base">
          Welcome back, {user?.name ?? "Super Admin"}. Super admins use a
          separate account from admin operators and have full access to
          operations, settings, user management, and platform fixes.
        </p>
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            className="rounded-[1.75rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg"
            href={card.href}
            key={card.href}
          >
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
              {card.label}
            </p>
            <p className="mt-3 text-3xl font-black text-slate-950">{card.value}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{card.detail}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
