"use client";

import { apiRoutes } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import { AdminModuleShell, statusClass } from "../AdminModuleShell";

type Driver = {
  id: number;
  name: string | null;
  email: string | null;
  contact_number: string | null;
  license_number: string | null;
  phone: string | null;
  date_of_birth: string | null;
  current_address: string | null;
  profile_photo: string | null;
  government_id_type: string | null;
  government_id_file: string | null;
  license_file: string | null;
  license_expiry_date: string | null;
  license_restriction: string | null;
  toda_id_file: string | null;
  toda_id_number: string | null;
  toda_association: string | null;
  franchise_permit_file: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  background_check_consent: boolean;
  platform_rules_accepted: boolean;
  submitted_at: string | null;
  approval_status: string;
  status: string;
  rejection_reason: string | null;
  vehicle_type: string | null;
  plate_number: string | null;
  body_number: string | null;
  color: string | null;
  vehicle_photo: string | null;
  orcr_file: string | null;
  registration_expiry_date: string | null;
  created_at: string;
};

function documentStatus(filePath: string | null) {
  return filePath ? "Submitted" : "Missing";
}

export default function AdminDriversPage() {
  const [busyDriverId, setBusyDriverId] = useState<number | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadDrivers = useCallback(async () => {
    const response = await fetch(apiRoutes.adminDrivers);
    const data = (await response.json()) as {
      drivers?: Driver[];
      message?: string;
    };

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to load drivers.");
    }

    setDrivers(data.drivers ?? []);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        await loadDrivers();
      } catch (caughtError) {
        setError(
          caughtError instanceof Error ? caughtError.message : "Unable to load drivers.",
        );
      }
    }

    void load();
  }, [loadDrivers]);

  async function updateDriverApproval(
    driverId: number,
    approvalStatus: "approved" | "rejected" | "pending",
  ) {
    setBusyDriverId(driverId);
    setError("");
    setNotice("");

    try {
      const response = await fetch(apiRoutes.adminDriverApproval(driverId), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          approval_status: approvalStatus,
          rejection_reason:
            approvalStatus === "rejected" ? "Rejected during admin review." : null,
        }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to update driver.");
      }

      setNotice(data.message ?? "Driver updated successfully.");
      await loadDrivers();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to update driver.",
      );
    } finally {
      setBusyDriverId(null);
    }
  }

  return (
    <AdminModuleShell
      description="Approve, reject, and review driver applications with license and vehicle details."
      title="Driver Verification"
    >
      {error && (
        <div className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-700">
          {notice}
        </div>
      )}

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        {drivers.map((driver) => (
          <article
            className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200"
            key={driver.id}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-black">{driver.name ?? "Driver"}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {driver.email ?? "No email"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(
                    driver.approval_status,
                  )}`}
                >
                  {driver.approval_status}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(
                    driver.status,
                  )}`}
                >
                  {driver.status}
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <p>
                <span className="font-bold text-slate-500">Contact:</span>{" "}
                {driver.phone ?? driver.contact_number ?? "N/A"}
              </p>
              <p>
                <span className="font-bold text-slate-500">Birth Date:</span>{" "}
                {driver.date_of_birth
                  ? new Date(driver.date_of_birth).toLocaleDateString()
                  : "N/A"}
              </p>
              <p className="sm:col-span-2">
                <span className="font-bold text-slate-500">Address:</span>{" "}
                {driver.current_address ?? "N/A"}
              </p>
              <p>
                <span className="font-bold text-slate-500">License:</span>{" "}
                {driver.license_number ?? "N/A"}
              </p>
              <p>
                <span className="font-bold text-slate-500">License Expiry:</span>{" "}
                {driver.license_expiry_date
                  ? new Date(driver.license_expiry_date).toLocaleDateString()
                  : "N/A"}
              </p>
              <p>
                <span className="font-bold text-slate-500">License Code:</span>{" "}
                {driver.license_restriction ?? "N/A"}
              </p>
              <p>
                <span className="font-bold text-slate-500">Government ID:</span>{" "}
                {driver.government_id_type ?? "N/A"}
              </p>
              <p>
                <span className="font-bold text-slate-500">TODA ID:</span>{" "}
                {driver.toda_id_number ?? "N/A"}
              </p>
              <p>
                <span className="font-bold text-slate-500">Association:</span>{" "}
                {driver.toda_association ?? "N/A"}
              </p>
              <p>
                <span className="font-bold text-slate-500">Vehicle:</span>{" "}
                {driver.vehicle_type ?? "N/A"}
              </p>
              <p>
                <span className="font-bold text-slate-500">Plate:</span>{" "}
                {driver.plate_number ?? "N/A"}
              </p>
              <p>
                <span className="font-bold text-slate-500">Body No.:</span>{" "}
                {driver.body_number ?? "N/A"}
              </p>
              <p>
                <span className="font-bold text-slate-500">Color:</span>{" "}
                {driver.color ?? "N/A"}
              </p>
              <p>
                <span className="font-bold text-slate-500">Registration Expiry:</span>{" "}
                {driver.registration_expiry_date
                  ? new Date(driver.registration_expiry_date).toLocaleDateString()
                  : "N/A"}
              </p>
              <p>
                <span className="font-bold text-slate-500">Emergency Contact:</span>{" "}
                {driver.emergency_contact_name ?? "N/A"}
              </p>
              <p>
                <span className="font-bold text-slate-500">Emergency Phone:</span>{" "}
                {driver.emergency_contact_number ?? "N/A"}
              </p>
              <p>
                <span className="font-bold text-slate-500">Applied:</span>{" "}
                {new Date(driver.submitted_at ?? driver.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="mt-5 rounded-3xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Document Checklist
              </p>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {[
                  ["Profile Photo", driver.profile_photo],
                  ["Government ID", driver.government_id_file],
                  ["Driver License", driver.license_file],
                  ["TODA ID", driver.toda_id_file],
                  ["Vehicle Photo", driver.vehicle_photo],
                  ["OR/CR", driver.orcr_file],
                  ["Franchise Permit", driver.franchise_permit_file],
                ].map(([label, filePath]) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2"
                    key={label}
                  >
                    <span className="font-bold text-slate-600">{label}</span>
                    <span
                      className={`rounded-full px-2 py-1 text-[0.7rem] font-black ${
                        filePath ? statusClass("approved") : statusClass("rejected")
                      }`}
                    >
                      {documentStatus(filePath)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-3 font-bold text-slate-600">
                Background check consent:{" "}
                {driver.background_check_consent ? "Yes" : "No"}
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 font-bold text-slate-600">
                Rules accepted: {driver.platform_rules_accepted ? "Yes" : "No"}
              </div>
            </div>

            {driver.rejection_reason && (
              <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">
                {driver.rejection_reason}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={
                  busyDriverId === driver.id ||
                  driver.approval_status === "approved"
                }
                onClick={() => updateDriverApproval(driver.id, "approved")}
                type="button"
              >
                Approve
              </button>
              <button
                className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={
                  busyDriverId === driver.id ||
                  driver.approval_status === "rejected"
                }
                onClick={() => updateDriverApproval(driver.id, "rejected")}
                type="button"
              >
                Reject
              </button>
              <button
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={
                  busyDriverId === driver.id ||
                  driver.approval_status === "pending"
                }
                onClick={() => updateDriverApproval(driver.id, "pending")}
                type="button"
              >
                Mark Pending
              </button>
            </div>
          </article>
        ))}
        {!drivers.length && (
          <div className="rounded-[2rem] bg-white p-8 text-center font-black shadow-sm ring-1 ring-slate-200 xl:col-span-2">
            No driver applications yet.
          </div>
        )}
      </section>
    </AdminModuleShell>
  );
}
