"use client";

import { adminGet, adminPatch, apiRoutes } from "@/lib/adminApi";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useLiveDashboardRefresh } from "@/hooks/useLiveDashboardRefresh";
import { useCallback, useEffect, useState } from "react";
import { AdminRejectDialog } from "../AdminRejectDialog";
import { AdminFilterBar, AdminFilterField, adminInputClass } from "../AdminFilters";
import { AdminModuleShell, statusClass } from "../AdminModuleShell";
import { AdminDocumentRow } from "../adminUi";

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
  is_suspended: boolean;
  suspension_reason: string | null;
  suspension_appeal_deadline_at?: string | null;
  suspension_appeal_submitted_at?: string | null;
  suspension_appeal_message?: string | null;
  suspension_requires_office_visit?: boolean;
  account_permanently_closed_at?: string | null;
  rejection_reason: string | null;
  vehicle_type: string | null;
  plate_number: string | null;
  body_number: string | null;
  color: string | null;
  vehicle_photo: string | null;
  orcr_file: string | null;
  registration_expiry_date: string | null;
  created_at: string;
  document_urls: {
    profile_photo: string | null;
    government_id_file: string | null;
    license_file: string | null;
    toda_id_file: string | null;
    franchise_permit_file: string | null;
    vehicle_photo: string | null;
    orcr_file: string | null;
  };
};

export default function AdminDriversPage() {
  const [busyDriverId, setBusyDriverId] = useState<number | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Driver | null>(null);
  const [approveTarget, setApproveTarget] = useState<Driver | null>(null);
  const [editTarget, setEditTarget] = useState<Driver | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    contact_number: "",
    phone: "",
    license_number: "",
    toda_association: "",
    plate_number: "",
    vehicle_type: "",
  });
  const [accountAction, setAccountAction] = useState<{
    action: "activate" | "suspend";
    driver: Driver;
  } | null>(null);
  const [approvalFilter, setApprovalFilter] = useState("pending");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("approval_status");

    if (param) {
      setApprovalFilter(param);
    }
  }, []);

  const loadDrivers = useCallback(async () => {
    const response = await adminGet(apiRoutes.adminDrivers, {
      approval_status: approvalFilter || undefined,
      search: search || undefined,
    });
    const data = (await response.json()) as {
      drivers?: Driver[];
      message?: string;
    };

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to load drivers.");
    }

    setDrivers(data.drivers ?? []);
    setError("");
  }, [approvalFilter, search]);

  const refreshDrivers = useCallback(async () => {
    setIsRefreshing(true);

    try {
      await loadDrivers();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to load drivers.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [loadDrivers]);

  useEffect(() => {
    void refreshDrivers();
  }, [refreshDrivers]);

  useLiveDashboardRefresh(refreshDrivers, true, 10000);

  async function updateDriverApproval(
    driverId: number,
    approvalStatus: "approved" | "rejected",
    rejectionReason?: string,
  ) {
    setBusyDriverId(driverId);
    setError("");
    setNotice("");

    try {
      const response = await adminPatch(apiRoutes.adminDriverApproval(driverId), {
        approval_status: approvalStatus,
        rejection_reason:
          approvalStatus === "rejected" ? (rejectionReason ?? null) : null,
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to update driver.");
      }

      setNotice(data.message ?? "Driver updated successfully.");
      setRejectTarget(null);
      setApproveTarget(null);
      await loadDrivers();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to update driver.",
      );
    } finally {
      setBusyDriverId(null);
    }
  }

  async function updateDriverAccount(
    driverId: number,
    action: "activate" | "suspend",
    reason: string,
  ) {
    setBusyDriverId(driverId);
    setError("");
    setNotice("");

    try {
      const response = await adminPatch(apiRoutes.adminDriverAccount(driverId), {
        action,
        reason,
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to update driver account.");
      }

      setNotice(data.message ?? "Driver account updated.");
      setAccountAction(null);
      await loadDrivers();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to update driver account.",
      );
    } finally {
      setBusyDriverId(null);
    }
  }

  function openEdit(driver: Driver) {
    setEditTarget(driver);
    setEditForm({
      name: driver.name ?? "",
      email: driver.email ?? "",
      contact_number: driver.contact_number ?? "",
      phone: driver.phone ?? "",
      license_number: driver.license_number ?? "",
      toda_association: driver.toda_association ?? "",
      plate_number: driver.plate_number ?? "",
      vehicle_type: driver.vehicle_type ?? "",
    });
  }

  async function saveDriverDetails() {
    if (!editTarget) {
      return;
    }

    setBusyDriverId(editTarget.id);
    setError("");
    setNotice("");

    try {
      const response = await adminPatch(apiRoutes.adminDriverDetails(editTarget.id), editForm);
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to save driver details.");
      }

      setNotice(data.message ?? "Driver details saved.");
      setEditTarget(null);
      await loadDrivers();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to save driver details.",
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

      <AdminFilterBar>
        <AdminFilterField label="Approval Status">
          <select
            className={adminInputClass()}
            onChange={(event) => setApprovalFilter(event.target.value)}
            value={approvalFilter}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </AdminFilterField>
        <AdminFilterField label="Search">
          <input
            className={adminInputClass()}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, email, license..."
            value={search}
          />
        </AdminFilterField>
        <div className="flex items-end">
          <button
            className="min-h-11 rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-60 sm:text-sm"
            disabled={isRefreshing}
            onClick={() => void refreshDrivers()}
            type="button"
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </AdminFilterBar>

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
                {driver.is_suspended ? (
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass("rejected")}`}>
                    suspended
                  </span>
                ) : null}
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
                {(
                  [
                    ["Profile Photo", driver.document_urls?.profile_photo],
                    ["Government ID", driver.document_urls?.government_id_file],
                    ["Driver License", driver.document_urls?.license_file],
                    ["TODA ID", driver.document_urls?.toda_id_file],
                    ["Vehicle Photo", driver.document_urls?.vehicle_photo],
                    ["OR/CR", driver.document_urls?.orcr_file],
                    ["Franchise Permit", driver.document_urls?.franchise_permit_file],
                  ] as const
                ).map(([label, url]) => (
                  <AdminDocumentRow key={label} label={label} url={url} />
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

            {driver.suspension_reason && (
              <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-800">
                Suspended: {driver.suspension_reason}
              </div>
            )}

            {driver.is_suspended && driver.suspension_appeal_submitted_at ? (
              <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950">
                <p className="font-black">Appeal submitted</p>
                <p className="mt-1 text-xs text-orange-800">
                  {new Date(driver.suspension_appeal_submitted_at).toLocaleString()}
                </p>
                {driver.suspension_appeal_message ? (
                  <p className="mt-3 leading-6">{driver.suspension_appeal_message}</p>
                ) : null}
              </div>
            ) : null}

            {driver.is_suspended && driver.suspension_requires_office_visit ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
                Appeal window expired — driver must visit the TriWheel office in person.
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700"
                onClick={() => openEdit(driver)}
                type="button"
              >
                Edit Details
              </button>
              {driver.approval_status === "approved" ? (
                <>
                  <button
                    className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={
                      busyDriverId === driver.id ||
                      driver.is_suspended
                    }
                    onClick={() =>
                      setAccountAction({ driver, action: "suspend" })
                    }
                    type="button"
                  >
                    Suspend
                  </button>
                  <button
                    className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={
                      busyDriverId === driver.id ||
                      !driver.is_suspended
                    }
                    onClick={() =>
                      setAccountAction({ driver, action: "activate" })
                    }
                    type="button"
                  >
                    Activate
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={
                      busyDriverId === driver.id ||
                      driver.approval_status === "approved"
                    }
                    onClick={() => setApproveTarget(driver)}
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
                    onClick={() => setRejectTarget(driver)}
                    type="button"
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
        {!drivers.length && (
          <div className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 xl:col-span-2">
            <p className="font-black text-slate-900">
              {approvalFilter === "pending"
                ? "No pending driver applications right now."
                : "No drivers match this filter."}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Make sure Approval Status is set to Pending, then click Refresh.
            </p>
          </div>
        )}
      </section>

      <ConfirmDialog
        confirmLabel="Approve Driver"
        description="Confirm that you reviewed the documents and this driver can receive ride requests."
        isConfirming={busyDriverId === approveTarget?.id}
        onCancel={() => setApproveTarget(null)}
        onConfirm={() => {
          if (!approveTarget) {
            return;
          }

          void updateDriverApproval(approveTarget.id, "approved");
        }}
        open={approveTarget !== null}
        title={approveTarget?.name ?? "Approve driver"}
      />

      {editTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-black">Edit Driver</h2>
            <div className="mt-5 grid gap-3">
              {(
                [
                  ["name", "Name"],
                  ["email", "Email"],
                  ["contact_number", "Contact"],
                  ["phone", "Driver phone"],
                  ["license_number", "License"],
                  ["toda_association", "TODA"],
                  ["vehicle_type", "Vehicle type"],
                  ["plate_number", "Plate"],
                ] as const
              ).map(([field, label]) => (
                <label className="grid gap-1 text-sm font-bold" key={field}>
                  {label}
                  <input
                    className={adminInputClass()}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, [field]: event.target.value }))
                    }
                    value={editForm[field]}
                  />
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded-2xl border px-4 py-2 font-black" onClick={() => setEditTarget(null)} type="button">
                Cancel
              </button>
              <button
                className="rounded-2xl bg-orange-500 px-4 py-2 font-black text-white disabled:bg-slate-300"
                disabled={busyDriverId === editTarget.id}
                onClick={() => void saveDriverDetails()}
                type="button"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AdminRejectDialog
        confirmLabel="Reject Driver"
        description="Provide a clear reason so the driver knows what to fix before reapplying."
        isOpen={rejectTarget !== null}
        isSubmitting={busyDriverId === rejectTarget?.id}
        onClose={() => setRejectTarget(null)}
        onConfirm={(reason) => {
          if (!rejectTarget) {
            return;
          }

          void updateDriverApproval(rejectTarget.id, "rejected", reason);
        }}
        title={rejectTarget?.name ?? "Driver"}
      />

      <AdminRejectDialog
        confirmLabel={
          accountAction?.action === "activate" ? "Activate Driver" : "Suspend Driver"
        }
        description={
          accountAction?.action === "activate"
            ? "Explain why this driver is being reactivated on the platform."
            : "Explain why this driver is being suspended. They will be logged out and set offline."
        }
        isOpen={accountAction !== null}
        isSubmitting={busyDriverId === accountAction?.driver.id}
        onClose={() => setAccountAction(null)}
        onConfirm={(reason) => {
          if (!accountAction) {
            return;
          }

          void updateDriverAccount(
            accountAction.driver.id,
            accountAction.action,
            reason,
          );
        }}
        title={accountAction?.driver.name ?? "Driver"}
      />
    </AdminModuleShell>
  );
}
