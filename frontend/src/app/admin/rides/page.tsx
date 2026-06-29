"use client";

import { adminGet, adminPatch, apiRoutes } from "@/lib/adminApi";
import { useCallback, useEffect, useState } from "react";
import { AdminFilterBar, AdminFilterField, adminInputClass } from "../AdminFilters";
import { AdminModuleShell, statusClass } from "../AdminModuleShell";

type Ride = {
  id: number;
  passenger_name: string | null;
  passenger_phone: string | null;
  driver_name: string | null;
  vehicle_type: string | null;
  plate_number: string | null;
  pickup_address: string;
  dropoff_address: string;
  status: string;
  is_emergency: boolean;
  fare: number | null;
  created_at: string;
};

type ApprovedDriver = { id: number; name: string | null; status: string };

export default function AdminRidesPage() {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rides, setRides] = useState<Ride[]>([]);
  const [drivers, setDrivers] = useState<ApprovedDriver[]>([]);
  const [busyRideId, setBusyRideId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [reassignRideId, setReassignRideId] = useState<number | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");

  const loadRides = useCallback(async () => {
    const response = await adminGet(apiRoutes.adminRides, {
      status: statusFilter || undefined,
      emergency: emergencyOnly || undefined,
      search: search || undefined,
    });
    const data = (await response.json()) as { message?: string; rides?: Ride[] };

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to load rides.");
    }

    setRides(data.rides ?? []);
  }, [emergencyOnly, search, statusFilter]);

  useEffect(() => {
    void loadRides().catch((caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load rides.");
    });
  }, [loadRides]);

  useEffect(() => {
    async function loadDrivers() {
      const response = await adminGet(apiRoutes.adminDriversApproved);
      const data = (await response.json()) as { drivers?: ApprovedDriver[] };
      setDrivers(data.drivers ?? []);
    }

    void loadDrivers();
  }, []);

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

      setNotice(data.message ?? "Ride cancelled.");
      await loadRides();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to cancel ride.");
    } finally {
      setBusyRideId(null);
    }
  }

  async function reassignRide(rideId: number) {
    if (!selectedDriverId) {
      return;
    }

    setBusyRideId(rideId);
    setError("");
    setNotice("");

    try {
      const response = await adminPatch(apiRoutes.adminRideReassign(rideId), {
        driver_id: Number(selectedDriverId),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to reassign ride.");
      }

      setNotice(data.message ?? "Ride reassigned.");
      setReassignRideId(null);
      setSelectedDriverId("");
      await loadRides();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to reassign ride.");
    } finally {
      setBusyRideId(null);
    }
  }

  return (
    <AdminModuleShell description="Review, cancel, and reassign rides across the platform." title="Ride Operations">
      {error ? <div className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div> : null}
      {notice ? <div className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-700">{notice}</div> : null}

      <AdminFilterBar>
        <AdminFilterField label="Status">
          <select className={adminInputClass()} onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            <option value="">All</option>
            <option value="requested">Requested</option>
            <option value="accepted">Accepted</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </AdminFilterField>
        <AdminFilterField label="Emergency">
          <select className={adminInputClass()} onChange={(event) => setEmergencyOnly(event.target.value === "true")} value={emergencyOnly ? "true" : ""}>
            <option value="">All rides</option>
            <option value="true">Emergency only</option>
          </select>
        </AdminFilterField>
        <AdminFilterField label="Search">
          <input className={adminInputClass()} onChange={(event) => setSearch(event.target.value)} placeholder="Ride ID or address..." value={search} />
        </AdminFilterField>
      </AdminFilterBar>

      <section className="mt-6 overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Ride</th>
                <th className="px-5 py-3">Passenger</th>
                <th className="px-5 py-3">Driver</th>
                <th className="px-5 py-3">Route</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Fare</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rides.map((ride) => (
                <tr key={ride.id}>
                  <td className="px-5 py-4">
                    <div className="font-black">#{ride.id}</div>
                    <div className="text-slate-500">{new Date(ride.created_at).toLocaleString()}</div>
                    {ride.is_emergency ? <span className="mt-1 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase text-red-700">Emergency</span> : null}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-black">{ride.passenger_name ?? "Passenger"}</div>
                    <div className="text-slate-500">{ride.passenger_phone ?? "N/A"}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-black">{ride.driver_name ?? "N/A"}</div>
                    <div className="text-slate-500">{ride.vehicle_type} {ride.plate_number}</div>
                  </td>
                  <td className="max-w-xs px-5 py-4 text-slate-600">
                    <div className="font-bold">From: {ride.pickup_address}</div>
                    <div className="mt-1">To: {ride.dropoff_address}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(ride.status)}`}>{ride.status}</span>
                  </td>
                  <td className="px-5 py-4 font-black">{ride.fare !== null ? `PHP ${ride.fare.toFixed(2)}` : "N/A"}</td>
                  <td className="px-5 py-4">
                    {!["completed", "cancelled"].includes(ride.status) ? (
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-xl bg-red-500 px-3 py-1.5 text-xs font-black text-white disabled:bg-slate-300" disabled={busyRideId === ride.id} onClick={() => void cancelRide(ride.id)} type="button">Cancel</button>
                        {["requested", "accepted"].includes(ride.status) ? (
                          <button className="rounded-xl border px-3 py-1.5 text-xs font-black" onClick={() => setReassignRideId(ride.id)} type="button">Reassign</button>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Closed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {reassignRideId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6">
            <h2 className="text-2xl font-black">Reassign Ride #{reassignRideId}</h2>
            <select className={`${adminInputClass()} mt-4 w-full`} onChange={(event) => setSelectedDriverId(event.target.value)} value={selectedDriverId}>
              <option value="">Select approved driver</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>{driver.name} ({driver.status})</option>
              ))}
            </select>
            <div className="mt-5 flex justify-end gap-3">
              <button className="rounded-2xl border px-4 py-2 font-black" onClick={() => setReassignRideId(null)} type="button">Cancel</button>
              <button className="rounded-2xl bg-orange-500 px-4 py-2 font-black text-white" disabled={!selectedDriverId || busyRideId === reassignRideId} onClick={() => void reassignRide(reassignRideId)} type="button">Reassign</button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminModuleShell>
  );
}
