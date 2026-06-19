"use client";

import { apiRoutes } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import { AdminModuleShell, statusClass } from "../AdminModuleShell";

type Ride = {
  id: number;
  passenger_name: string | null;
  passenger_email: string | null;
  passenger_phone: string | null;
  driver_name: string | null;
  vehicle_type: string | null;
  plate_number: string | null;
  pickup_address: string;
  dropoff_address: string;
  ride_type: string | null;
  status: string;
  fare: number | null;
  created_at: string;
};

export default function AdminRidesPage() {
  const [error, setError] = useState("");
  const [rides, setRides] = useState<Ride[]>([]);

  const loadRides = useCallback(async () => {
    const response = await fetch(apiRoutes.adminRides);
    const data = (await response.json()) as {
      message?: string;
      rides?: Ride[];
    };

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to load rides.");
    }

    setRides(data.rides ?? []);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        await loadRides();
      } catch (caughtError) {
        setError(
          caughtError instanceof Error ? caughtError.message : "Unable to load rides.",
        );
      }
    }

    void load();
  }, [loadRides]);

  return (
    <AdminModuleShell
      description="Review requested, active, completed, and cancelled rides across the platform."
      title="Ride Operations"
    >
      {error && (
        <div className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">
          {error}
        </div>
      )}

      <section className="mt-6 rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">Recent Rides</h2>
            <p className="mt-1 text-sm text-slate-500">
              Showing latest {rides.length} ride records.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="py-3">Ride</th>
                <th className="py-3">Passenger</th>
                <th className="py-3">Driver</th>
                <th className="py-3">Route</th>
                <th className="py-3">Status</th>
                <th className="py-3">Fare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rides.map((ride) => (
                <tr key={ride.id}>
                  <td className="py-4">
                    <div className="font-black">#{ride.id}</div>
                    <div className="text-slate-500">
                      {new Date(ride.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="font-black">
                      {ride.passenger_name ?? "Passenger"}
                    </div>
                    <div className="text-slate-500">
                      {ride.passenger_phone ?? ride.passenger_email ?? "N/A"}
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="font-black">{ride.driver_name ?? "N/A"}</div>
                    <div className="text-slate-500">
                      {ride.vehicle_type ?? "Vehicle"}{" "}
                      {ride.plate_number ? `- ${ride.plate_number}` : ""}
                    </div>
                  </td>
                  <td className="max-w-xs py-4 text-slate-600">
                    <div className="font-bold">From: {ride.pickup_address}</div>
                    <div className="mt-1">To: {ride.dropoff_address}</div>
                  </td>
                  <td className="py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(
                        ride.status,
                      )}`}
                    >
                      {ride.status}
                    </span>
                  </td>
                  <td className="py-4 font-black">
                    {ride.fare !== null ? `PHP ${ride.fare.toFixed(2)}` : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminModuleShell>
  );
}
