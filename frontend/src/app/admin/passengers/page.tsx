"use client";

import { adminGet, adminPatch, apiRoutes } from "@/lib/adminApi";
import { formatDateTime } from "@/lib/formatDateTime";
import { useCallback, useEffect, useState } from "react";
import { AdminFilterBar, AdminFilterField, adminInputClass, useDebouncedValue } from "../AdminFilters";
import { AdminModuleShell, statusClass } from "../AdminModuleShell";
import { AdminRejectDialog } from "../AdminRejectDialog";
import { AdminDocumentRow } from "../adminUi";

type Passenger = {
  id: number;
  name: string;
  email: string;
  contact_number: string | null;
  current_address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  is_suspended: boolean;
  suspension_reason?: string | null;
  rides_count: number;
  submitted_at: string | null;
  created_at: string;
  document_urls: {
    profile_photo: string | null;
    government_id_file: string | null;
  };
};

export default function AdminPassengersPage() {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyPassengerId, setBusyPassengerId] = useState<number | null>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [suspendTarget, setSuspendTarget] = useState<Passenger | null>(null);
  const [editTarget, setEditTarget] = useState<Passenger | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    contact_number: "",
    current_address: "",
    emergency_contact_name: "",
    emergency_contact_number: "",
  });
  const [search, setSearch] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [suspendedFilter, setSuspendedFilter] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const loadPassengers = useCallback(async () => {
    const response = await adminGet(apiRoutes.adminPassengers, {
      search: debouncedSearch || undefined,
      verified: verifiedFilter === "" ? undefined : verifiedFilter === "yes",
      suspended: suspendedFilter === "" ? undefined : suspendedFilter === "yes",
    });
    const data = (await response.json()) as {
      message?: string;
      passengers?: Passenger[];
    };

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to load passengers.");
    }

    setPassengers(data.passengers ?? []);
  }, [debouncedSearch, suspendedFilter, verifiedFilter]);

  useEffect(() => {
    void loadPassengers().catch((caughtError) => {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to load passengers.",
      );
    });
  }, [loadPassengers]);

  async function toggleSuspend(passenger: Passenger, reason: string) {
    setBusyPassengerId(passenger.id);
    setError("");
    setNotice("");

    try {
      const response = await adminPatch(apiRoutes.adminPassengerAccount(passenger.id), {
        is_suspended: !passenger.is_suspended,
        suspension_reason: passenger.is_suspended ? null : reason,
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to update passenger account.");
      }

      setNotice(data.message ?? "Passenger account updated.");
      setSuspendTarget(null);
      await loadPassengers();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to update passenger account.",
      );
    } finally {
      setBusyPassengerId(null);
    }
  }

  function openEdit(passenger: Passenger) {
    setEditTarget(passenger);
    setEditForm({
      name: passenger.name,
      email: passenger.email,
      contact_number: passenger.contact_number ?? "",
      current_address: passenger.current_address ?? "",
      emergency_contact_name: passenger.emergency_contact_name ?? "",
      emergency_contact_number: passenger.emergency_contact_number ?? "",
    });
  }

  async function savePassengerDetails() {
    if (!editTarget) {
      return;
    }

    setBusyPassengerId(editTarget.id);
    setError("");
    setNotice("");

    try {
      const response = await adminPatch(apiRoutes.adminPassengerDetails(editTarget.id), editForm);
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to save passenger details.");
      }

      setNotice(data.message ?? "Passenger details saved.");
      setEditTarget(null);
      await loadPassengers();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to save passenger details.",
      );
    } finally {
      setBusyPassengerId(null);
    }
  }

  return (
    <AdminModuleShell
      description="View passenger accounts, uploaded ID documents, and ride activity."
      title="Passengers"
    >
      {error ? <div className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div> : null}
      {notice ? <div className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-700">{notice}</div> : null}

      <AdminFilterBar>
        <AdminFilterField label="Search">
          <input
            className={adminInputClass()}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or email..."
            value={search}
          />
        </AdminFilterField>
        <AdminFilterField label="Verified">
          <select
            className={adminInputClass()}
            onChange={(event) => setVerifiedFilter(event.target.value)}
            value={verifiedFilter}
          >
            <option value="">All</option>
            <option value="yes">Verified</option>
            <option value="no">Unverified</option>
          </select>
        </AdminFilterField>
        <AdminFilterField label="Account">
          <select
            className={adminInputClass()}
            onChange={(event) => setSuspendedFilter(event.target.value)}
            value={suspendedFilter}
          >
            <option value="">All</option>
            <option value="no">Active</option>
            <option value="yes">Deactivated</option>
          </select>
        </AdminFilterField>
      </AdminFilterBar>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {passengers.map((passenger) => (
          <article className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200" key={passenger.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">{passenger.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{passenger.email}</p>
              </div>
              {passenger.is_suspended ? (
                <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass("rejected")}`}>
                  deactivated
                </span>
              ) : (
                <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass("verified")}`}>
                  active
                </span>
              )}
            </div>

            <div className="mt-5 grid gap-3 text-sm">
              <p><span className="font-bold text-slate-500">Contact:</span> {passenger.contact_number ?? "N/A"}</p>
              <p><span className="font-bold text-slate-500">Ride Count:</span> {passenger.rides_count}</p>
              <p><span className="font-bold text-slate-500">Joined:</span> {formatDateTime(passenger.submitted_at ?? passenger.created_at)}</p>
            </div>

            <div className="mt-5 rounded-3xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Registration documents
              </p>
              <div className="mt-3 grid gap-2 text-sm">
                <AdminDocumentRow label="Profile Photo" url={passenger.document_urls?.profile_photo} />
                <AdminDocumentRow label="Government ID" url={passenger.document_urls?.government_id_file} />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700"
                onClick={() => openEdit(passenger)}
                type="button"
              >
                Edit Details
              </button>
              <button
                className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300"
                disabled={busyPassengerId === passenger.id || passenger.is_suspended}
                onClick={() => setSuspendTarget(passenger)}
                type="button"
              >
                Deactivate
              </button>
              <button
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300"
                disabled={busyPassengerId === passenger.id || !passenger.is_suspended}
                onClick={() => void toggleSuspend(passenger, "")}
                type="button"
              >
                Reactivate
              </button>
            </div>
          </article>
        ))}
        {!passengers.length ? (
          <div className="rounded-[2rem] bg-white p-8 text-center font-black shadow-sm ring-1 ring-slate-200 md:col-span-2 xl:col-span-3">
            No passengers match this search.
          </div>
        ) : null}
      </section>

      {editTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-black">Edit Passenger</h2>
            <div className="mt-5 grid gap-3">
              {(
                [
                  ["name", "Name"],
                  ["email", "Email"],
                  ["contact_number", "Contact"],
                  ["current_address", "Address"],
                  ["emergency_contact_name", "Emergency contact"],
                  ["emergency_contact_number", "Emergency phone"],
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
                disabled={busyPassengerId === editTarget.id}
                onClick={() => void savePassengerDetails()}
                type="button"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AdminRejectDialog
        confirmLabel="Deactivate Passenger"
        description="Explain why this passenger account is being deactivated."
        isOpen={suspendTarget !== null}
        isSubmitting={busyPassengerId === suspendTarget?.id}
        onClose={() => setSuspendTarget(null)}
        onConfirm={(reason) => {
          if (!suspendTarget) {
            return;
          }

          void toggleSuspend(suspendTarget, reason);
        }}
        title={suspendTarget?.name ?? "Passenger"}
      />
    </AdminModuleShell>
  );
}
