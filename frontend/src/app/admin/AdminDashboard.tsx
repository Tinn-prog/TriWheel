"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { NotificationBell } from "@/components/NotificationBell";
import { useLiveDashboardRefresh } from "@/hooks/useLiveDashboardRefresh";
import { adminGet, apiRoutes } from "@/lib/adminApi";
import { useStoredTriWheelSession } from "./AdminAccessGate";
import { statusClass } from "./adminUi";

type AdminOverview = {
  stats: {
    users: {
      total: number;
      admins: number;
      drivers: number;
      passengers: number;
    };
    drivers: {
      total: number;
      approved: number;
      pending: number;
      rejected: number;
      online: number;
      online_with_gps: number;
      online_without_live_gps: number;
      offline: number;
      live_gps_fresh_minutes: number;
    };
    rides: {
      total: number;
      requested: number;
      ongoing: number;
      completed: number;
      cancelled: number;
      revenue: number;
    };
  };
  recent_users: Array<{
    id: number;
    name: string;
    email: string;
    contact_number: string | null;
    role: string;
    created_at: string;
  }>;
  drivers: Array<{
    id: number;
    name: string | null;
    email: string | null;
    contact_number: string | null;
    license_number: string | null;
    approval_status: string;
    status: string;
    vehicle_type: string | null;
    plate_number: string | null;
    color: string | null;
  }>;
};

export function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");
  const [lastLiveRefreshAt, setLastLiveRefreshAt] = useState<Date | null>(null);
  const { user } = useStoredTriWheelSession();

  const loadOverview = useCallback(async () => {
    const response = await adminGet(apiRoutes.adminOverview);
    const data = (await response.json()) as AdminOverview & { message?: string };

    if (!response.ok) {
      throw new Error(data.message ?? "Failed to load admin dashboard.");
    }

    setOverview(data);
    setLastLiveRefreshAt(new Date());
    setError("");
  }, []);

  useEffect(() => {
    void loadOverview().catch((caughtError) => {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to load admin dashboard.",
      );
    });
  }, [loadOverview]);

  useLiveDashboardRefresh(
    async () => {
      try {
        await loadOverview();
      } catch {
        // Keep the last good dashboard snapshot during background refresh.
      }
    },
    true,
    5000,
  );

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div>
    );
  }

  if (!overview) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center font-black shadow-sm ring-1 ring-slate-200">
        Loading admin dashboard...
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Users",
      value: overview.stats.users.total,
      detail: `${overview.stats.users.passengers} passengers, ${overview.stats.users.drivers} drivers`,
    },
    {
      label: "Total Rides",
      value: overview.stats.rides.total,
      detail: `${overview.stats.rides.completed} completed, ${overview.stats.rides.cancelled} cancelled`,
    },
    {
      label: "Revenue",
      value: `₱${overview.stats.rides.revenue.toLocaleString()}`,
      detail: "From completed rides",
    },
    {
      label: "Pending Drivers",
      value: overview.stats.drivers.pending,
      detail: `${overview.stats.drivers.approved} approved drivers`,
      href: "/admin/drivers?approval_status=pending",
    },
  ];

  return (
    <>
      <header className="rounded-[1.75rem] bg-gradient-to-br from-orange-500 to-orange-700 p-5 text-white shadow-xl shadow-orange-200 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-100 sm:text-sm">
              Admin Dashboard
            </p>
            <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
              TriWheel Operations
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-orange-50 sm:mt-3 sm:text-base">
              Monitor drivers, passengers, rides, and daily operations. Admin
              operator accounts use a separate login from super admin accounts.
            </p>
            <Link
              className="mt-4 inline-flex min-h-9 w-fit items-center justify-center rounded-lg bg-white px-4 py-2 text-xs font-black text-orange-700 sm:text-sm"
              href="/"
            >
              Back to Home
            </Link>
          </div>
          {user ? (
            <NotificationBell href="/admin/notifications" userId={user.id} />
          ) : null}
        </div>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <article
            className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
            key={card.label}
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              {card.label}
            </p>
            <div className="mt-2 text-3xl font-black text-slate-950">{card.value}</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">{card.detail}</p>
            {card.href ? (
              <Link
                className="mt-3 inline-flex text-xs font-black text-orange-600"
                href={card.href}
              >
                Review drivers →
              </Link>
            ) : null}
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
              </span>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                Live fleet
              </p>
            </div>
            <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
              {overview.stats.drivers.online_with_gps}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Approved drivers online with a GPS update in the last{" "}
              {overview.stats.drivers.live_gps_fresh_minutes} minutes.
            </p>
          </div>
          <div className="grid min-w-[12rem] gap-2 text-sm">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Marked online
              </p>
              <p className="mt-1 text-2xl font-black text-slate-900">
                {overview.stats.drivers.online}
              </p>
            </div>
            <div className="rounded-2xl bg-amber-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                Online, no live GPS
              </p>
              <p className="mt-1 text-2xl font-black text-amber-900">
                {overview.stats.drivers.online_without_live_gps}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-500">
            {lastLiveRefreshAt
              ? `Updated ${lastLiveRefreshAt.toLocaleTimeString()} · refreshes every 5 seconds`
              : "Refreshing live driver count..."}
          </p>
          <Link
            className="inline-flex text-sm font-black text-orange-600"
            href="/admin/map"
          >
            Open live map →
          </Link>
        </div>
      </section>

      <section className="mt-8 grid min-w-0 gap-6 xl:grid-cols-[1fr_0.9fr]">
        <article className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">Driver Verification</h2>
              <p className="mt-1 text-sm text-slate-500">
                Recent driver profiles and approval status.
              </p>
            </div>
            <Link
              className="rounded-full bg-orange-100 px-4 py-2 text-sm font-black text-orange-700"
              href="/admin/drivers?approval_status=pending"
            >
              {overview.stats.drivers.pending} pending
            </Link>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="py-3">Driver</th>
                  <th className="py-3">Vehicle</th>
                  <th className="py-3">License</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Online</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overview.drivers.map((driver) => (
                  <tr key={driver.id}>
                    <td className="py-4">
                      <div className="font-black">{driver.name}</div>
                      <div className="text-slate-500">{driver.email}</div>
                    </td>
                    <td className="py-4 text-slate-600">
                      {driver.vehicle_type ?? "No vehicle"}{" "}
                      {driver.plate_number ? `• ${driver.plate_number}` : ""}
                    </td>
                    <td className="py-4 text-slate-600">
                      {driver.license_number ?? "-"}
                    </td>
                    <td className="py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(
                          driver.approval_status,
                        )}`}
                      >
                        {driver.approval_status}
                      </span>
                    </td>
                    <td className="py-4 text-slate-600">{driver.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-black">Ride Operations</h2>
          <p className="mt-1 text-sm text-slate-500">Current ride status summary.</p>
          <div className="mt-6 grid gap-3">
            {[
              ["Requested", overview.stats.rides.requested],
              ["Ongoing", overview.stats.rides.ongoing],
              ["Completed", overview.stats.rides.completed],
              ["Cancelled", overview.stats.rides.cancelled],
            ].map(([label, value]) => (
              <div
                className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4"
                key={label}
              >
                <span className="font-bold text-slate-600">{label}</span>
                <span className="text-2xl font-black">{value}</span>
              </div>
            ))}
          </div>
          <Link
            className="mt-4 inline-flex text-sm font-black text-orange-600"
            href="/admin/rides"
          >
            View all rides →
          </Link>
        </article>
      </section>

      <section className="mt-8 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">Recent Users</h2>
            <p className="mt-1 text-sm text-slate-500">
              Latest registered accounts by role.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="py-3">Name</th>
                <th className="py-3">Email</th>
                <th className="py-3">Role</th>
                <th className="py-3">Phone</th>
                <th className="py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {overview.recent_users.map((user) => (
                <tr key={user.id}>
                  <td className="py-4 font-black">{user.name}</td>
                  <td className="py-4 text-slate-600">{user.email}</td>
                  <td className="py-4">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                      {user.role}
                    </span>
                  </td>
                  <td className="py-4 text-slate-600">
                    {user.contact_number ?? "-"}
                  </td>
                  <td className="py-4 text-slate-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
