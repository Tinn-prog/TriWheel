"use client";

import { adminDownload, adminGet, adminUpload, apiRoutes } from "@/lib/adminApi";
import { formatDateTime } from "@/lib/formatDateTime";
import { useEffect, useMemo, useState } from "react";
import {
  AdminExportButton,
  AdminFilterBar,
  AdminFilterField,
  AdminImportButton,
  adminInputClass,
} from "../AdminFilters";
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

const importTemplate = `Name,Email,Role,Admin Role,Contact,Password
TriWheel Operator,operator@example.com,admin,operator,09170000000,password123
Pat Passenger,passenger@example.com,passenger,,09170000001,password123`;

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<RatingsSummary | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
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

  async function handleImportUsers(file: File) {
    setIsImporting(true);
    setError("");
    setNotice("");
    setImportErrors([]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await adminUpload(apiRoutes.adminImportUsers, formData);
      const payload = (await response.json()) as {
        message?: string;
        created?: number;
        skipped?: number;
        errors?: string[];
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Import failed.");
      }

      setNotice(payload.message ?? "Import finished.");
      setImportErrors(payload.errors ?? []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Import failed.");
    } finally {
      setIsImporting(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([importTemplate], { type: "text/csv;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "users-import-template.csv";
    link.click();
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <AdminModuleShell
      description="Ratings averages, CSV exports, and bulk user import tools."
      title="Analytics & Exports"
    >
      {error ? <div className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div> : null}
      {notice ? <div className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-700">{notice}</div> : null}

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
        <h2 className="text-xl font-black">Exports</h2>
        <p className="mt-2 text-sm text-slate-600">
          PDF and Word downloads include the TriWheel logo and report title.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Users</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <AdminExportButton
                filename="users.csv"
                label="CSV"
                onExport={(filename) =>
                  adminDownload(apiRoutes.adminExportUsers, filename, { format: "csv" })
                }
              />
              <AdminExportButton
                filename="users.pdf"
                label="PDF"
                onExport={(filename) =>
                  adminDownload(apiRoutes.adminExportUsers, filename, { format: "pdf" })
                }
              />
              <AdminExportButton
                filename="users.doc"
                label="Word"
                onExport={(filename) =>
                  adminDownload(apiRoutes.adminExportUsers, filename, { format: "docx" })
                }
              />
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Drivers</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <AdminExportButton
                filename="drivers.csv"
                label="CSV"
                onExport={(filename) =>
                  adminDownload(apiRoutes.adminExportDrivers, filename, { format: "csv" })
                }
              />
              <AdminExportButton
                filename="drivers.pdf"
                label="PDF"
                onExport={(filename) =>
                  adminDownload(apiRoutes.adminExportDrivers, filename, { format: "pdf" })
                }
              />
              <AdminExportButton
                filename="drivers.doc"
                label="Word"
                onExport={(filename) =>
                  adminDownload(apiRoutes.adminExportDrivers, filename, { format: "docx" })
                }
              />
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Rides</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <AdminExportButton
                filename="rides.csv"
                label="CSV"
                onExport={(filename) =>
                  adminDownload(apiRoutes.adminExportRides, filename, { format: "csv" })
                }
              />
              <AdminExportButton
                filename="rides.pdf"
                label="PDF"
                onExport={(filename) =>
                  adminDownload(apiRoutes.adminExportRides, filename, { format: "pdf" })
                }
              />
              <AdminExportButton
                filename="rides.doc"
                label="Word"
                onExport={(filename) =>
                  adminDownload(apiRoutes.adminExportRides, filename, { format: "docx" })
                }
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-black">CSV Import</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Import passenger or admin operator accounts from CSV. Required columns:{" "}
          <span className="font-bold">Name, Email, Role, Password</span>. Optional: Admin Role, Contact.
          Admin imports are limited to operator accounts.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <AdminImportButton
            disabled={isImporting}
            label={isImporting ? "Importing..." : "Import Users CSV"}
            onImport={handleImportUsers}
          />
          <button
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-800"
            onClick={downloadTemplate}
            type="button"
          >
            Download Template
          </button>
        </div>
        {importErrors.length ? (
          <ul className="mt-4 space-y-1 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            {importErrors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
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
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {formatDateTime(item.completed_at) || "Completed time unavailable"}
                </p>
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
