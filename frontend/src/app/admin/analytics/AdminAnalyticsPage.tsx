"use client";

import { adminDownload, adminGet, apiRoutes } from "@/lib/adminApi";
import { useEffect, useMemo, useState } from "react";
import { AdminExportButton, AdminFilterBar, AdminFilterField, adminInputClass } from "../AdminFilters";
import { AdminModuleShell } from "../AdminModuleShell";

type RatingsSummary = {
  summary: {
    passenger_to_driver: { count: number; average: number | null };
    driver_to_passenger: { count: number; average: number | null };
  };
  recent: Array<{
    id: number;
    passenger_name: string | null;
    driver_name: string | null;
    passenger_rating: number | null;
    passenger_feedback: string | null;
    driver_rating: number | null;
    driver_feedback: string | null;
    completed_at: string | null;
  }>;
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<RatingsSummary | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await adminGet(apiRoutes.adminRatings);
        const payload = (await response.json()) as RatingsSummary & { message?: string };

        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to load analytics.");
        }

        setData(payload);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load analytics.");
      }
    }

    void load();
  }, []);

  const filteredRecent = useMemo(() => {
    const query = search.trim().toLowerCase();
    const minimum = minRating ? Number(minRating) : null;

    return (data?.recent ?? []).filter((item) => {
      if (minimum !== null && !Number.isNaN(minimum)) {
        const passengerRating = item.passenger_rating ?? 0;
        const driverRating = item.driver_rating ?? 0;
        const bestRating = Math.max(passengerRating, driverRating);

        if (bestRating < minimum) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      return [
        item.passenger_name,
        item.driver_name,
        item.passenger_feedback,
        item.driver_feedback,
        String(item.id),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [data?.recent, minRating, search]);

  return (
    <AdminModuleShell
      description="Ratings averages and export tools for platform records."
      title="Analytics & Exports"
    >
      {error ? <div className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div> : null}

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Passenger → Driver</p>
          <p className="mt-2 text-4xl font-black">
            {data?.summary.passenger_to_driver.average?.toFixed(2) ?? "—"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {data?.summary.passenger_to_driver.count ?? 0} ratings
          </p>
        </article>
        <article className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Driver → Passenger</p>
          <p className="mt-2 text-4xl font-black">
            {data?.summary.driver_to_passenger.average?.toFixed(2) ?? "—"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {data?.summary.driver_to_passenger.count ?? 0} ratings
          </p>
        </article>
      </section>

      <section className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-black">CSV Exports</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <AdminExportButton
            filename="users.csv"
            label="Export Users"
            onExport={(filename) => adminDownload(apiRoutes.adminExportUsers, filename)}
          />
          <AdminExportButton
            filename="drivers.csv"
            label="Export Drivers"
            onExport={(filename) => adminDownload(apiRoutes.adminExportDrivers, filename)}
          />
          <AdminExportButton
            filename="rides.csv"
            label="Export Rides"
            onExport={(filename) => adminDownload(apiRoutes.adminExportRides, filename)}
          />
        </div>
      </section>

      <AdminFilterBar>
        <AdminFilterField label="Search">
          <input
            className={adminInputClass()}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ride ID, names, feedback..."
            value={search}
          />
        </AdminFilterField>
        <AdminFilterField label="Min Rating">
          <select
            className={adminInputClass()}
            onChange={(event) => setMinRating(event.target.value)}
            value={minRating}
          >
            <option value="">Any rating</option>
            <option value="5">5 stars</option>
            <option value="4">4+ stars</option>
            <option value="3">3+ stars</option>
            <option value="2">2+ stars</option>
            <option value="1">1+ stars</option>
          </select>
        </AdminFilterField>
      </AdminFilterBar>

      <section className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-black">Recent Ratings</h2>
        <div className="mt-4 grid gap-3">
          {filteredRecent.length ? (
            filteredRecent.map((item) => (
              <article className="rounded-2xl bg-slate-50 p-4 text-sm" key={item.id}>
                <p className="font-black">Ride #{item.id}</p>
                <p className="mt-1 text-slate-600">
                  {item.passenger_name} rated {item.driver_name}: {item.passenger_rating ?? "—"}★
                </p>
                {item.passenger_feedback ? <p className="mt-1 text-slate-500">{item.passenger_feedback}</p> : null}
                <p className="mt-2 text-slate-600">
                  Driver rated passenger: {item.driver_rating ?? "—"}★
                </p>
              </article>
            ))
          ) : (
            <p className="text-sm text-slate-500">No ratings match these filters.</p>
          )}
        </div>
      </section>
    </AdminModuleShell>
  );
}
