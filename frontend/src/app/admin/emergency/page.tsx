"use client";

import { adminGet, adminPatch, apiRoutes } from "@/lib/adminApi";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminFilterBar, AdminFilterField, adminInputClass, useDebouncedValue } from "../AdminFilters";
import { AdminModuleShell, statusClass } from "../AdminModuleShell";

type EmergencyRide = {
  id: number;
  passenger_name: string | null;
  passenger_phone: string | null;
  driver_name: string | null;
  pickup_address: string;
  dropoff_address: string;
  status: string;
  fare: number | null;
  created_at: string;
};

export default function AdminEmergencyPage() {
  const [rides, setRides] = useState<EmergencyRide[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyRideId, setBusyRideId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const debouncedSearch = useDebouncedValue(search);

  const loadRides = useCallback(async () => {
    const response = await adminGet(apiRoutes.adminRides, {
      emergency: true,
      status: statusFilter || undefined,
      search: debouncedSearch || undefined,
    });
    const data = (await response.json()) as {
      rides?: EmergencyRide[];
      message?: string;
    };

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to load emergency rides.");
    }

    setRides(data.rides ?? []);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    void loadRides().catch((caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load emergency rides.");
    });

    const interval = window.setInterval(() => {
      void loadRides().catch(() => undefined);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [loadRides]);

  async function cancelRide(rideId: number) {
    setBusyRideId(rideId);
    setError("");
    setNotice("");

    try {
      const response = await adminPatch(apiRoutes.adminRideCancel(rideId), {});
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to cancel ride.");
      }

      setNotice(data.message ?? "Emergency ride cancelled.");
      await loadRides();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to cancel ride.");
    } finally {
      setBusyRideId(null);
    }
  }

  const active = useMemo(
    () => rides.filter((ride) => !["completed", "cancelled"].includes(ride.status)),
    [rides],
  );

  const visibleRides = useMemo(
    () => (showCompleted ? rides : active),
    [active, rides, showCompleted],
  );

  return (
    <AdminModuleShell
      description="Monitor and intervene on emergency ride requests across the platform."
      title="Emergency Operations"
    >
      {error ? <div className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div> : null}
      {notice ? <div className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-700">{notice}</div> : null}

      <AdminFilterBar>
        <AdminFilterField label="Search">
          <input
            className={adminInputClass()}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ride ID, passenger, address..."
            value={search}
          />
        </AdminFilterField>
        <AdminFilterField label="Status">
          <select
            className={adminInputClass()}
            onChange={(event) => setStatusFilter(event.target.value)}
            value={statusFilter}
          >
            <option value="">All statuses</option>
            <option value="requested">Requested</option>
            <option value="accepted">Accepted</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </AdminFilterField>
        <AdminFilterField label="View">
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700">
            <input
              checked={showCompleted}
              className="size-4 accent-orange-600"
              onChange={(event) => setShowCompleted(event.target.checked)}
              type="checkbox"
            />
            Include completed / cancelled
          </label>
        </AdminFilterField>
      </AdminFilterBar>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Active</p>
          <p className="mt-2 text-3xl font-black text-red-600">{active.length}</p>
        </article>
        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Total Logged</p>
          <p className="mt-2 text-3xl font-black">{rides.length}</p>
        </article>
        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Refresh</p>
          <p className="mt-2 text-sm font-bold text-slate-600">Auto-updates every 15 seconds</p>
        </article>
      </section>

      <section className="mt-6 grid gap-4">
        {visibleRides.map((ride) => (
          <article className="rounded-[2rem] border border-red-200 bg-white p-5 shadow-sm" key={ride.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">Emergency #{ride.id}</p>
                <h2 className="mt-2 text-xl font-black">{ride.passenger_name ?? "Passenger"}</h2>
                <p className="mt-1 text-sm text-slate-500">{ride.passenger_phone ?? "No phone"}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(ride.status)}`}>
                {ride.status}
              </span>
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              <p><span className="font-bold text-slate-500">Pickup:</span> {ride.pickup_address}</p>
              <p><span className="font-bold text-slate-500">Dropoff:</span> {ride.dropoff_address}</p>
              <p><span className="font-bold text-slate-500">Driver:</span> {ride.driver_name ?? "Unassigned"}</p>
              <p><span className="font-bold text-slate-500">Requested:</span> {new Date(ride.created_at).toLocaleString()}</p>
            </div>
            {!["completed", "cancelled"].includes(ride.status) ? (
              <button
                className="mt-4 rounded-2xl bg-red-500 px-4 py-2 text-sm font-black text-white disabled:bg-slate-300"
                disabled={busyRideId === ride.id}
                onClick={() => void cancelRide(ride.id)}
                type="button"
              >
                Cancel Ride
              </button>
            ) : null}
          </article>
        ))}
        {!visibleRides.length ? (
          <div className="rounded-[2rem] bg-white p-8 text-center font-black shadow-sm ring-1 ring-slate-200">
            No emergency rides match these filters.
          </div>
        ) : null}
      </section>
    </AdminModuleShell>
  );
}
