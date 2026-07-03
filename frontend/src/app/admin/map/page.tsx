"use client";

import { adminGet, apiRoutes } from "@/lib/adminApi";
import { useLiveDashboardRefresh } from "@/hooks/useLiveDashboardRefresh";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminFilterBar, AdminFilterField, adminInputClass } from "../AdminFilters";
import { AdminModuleShell } from "../AdminModuleShell";
import dynamic from "next/dynamic";

const AdminLiveLeafletMap = dynamic(
  () =>
    import("@/components/leaflet/AdminLiveLeafletMap").then(
      (module) => module.AdminLiveLeafletMap,
    ),
  { ssr: false },
);

type DriverLocation = {
  id: number;
  name: string | null;
  phone: string | null;
  lat: number;
  lng: number;
  vehicle_type: string | null;
  plate_number: string | null;
};

const defaultCenter = { lat: 14.5995, lng: 120.9842 };

export default function AdminLiveMapPage() {
  const [drivers, setDrivers] = useState<DriverLocation[]>([]);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [liveGpsFreshMinutes, setLiveGpsFreshMinutes] = useState(3);
  const [search, setSearch] = useState("");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("");

  const loadDrivers = useCallback(async () => {
    const response = await adminGet(apiRoutes.adminDriverLocations);
    const data = (await response.json()) as {
      drivers?: DriverLocation[];
      live_gps_fresh_minutes?: number;
      online_with_gps?: number;
      message?: string;
    };

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to load driver locations.");
    }

    setDrivers(data.drivers ?? []);
    setLiveGpsFreshMinutes(data.live_gps_fresh_minutes ?? 3);
    setLastUpdatedAt(new Date());
    setError("");
  }, []);

  useEffect(() => {
    void loadDrivers().catch((caughtError) => {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load driver locations.",
      );
    });
  }, [loadDrivers]);

  useLiveDashboardRefresh(
    async () => {
      try {
        await loadDrivers();
      } catch {
        // Keep the last good map snapshot during background refresh.
      }
    },
    true,
    5000,
  );

  const filteredDrivers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return drivers.filter((driver) => {
      if (vehicleTypeFilter && driver.vehicle_type !== vehicleTypeFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [driver.name, driver.plate_number, driver.phone, driver.vehicle_type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [drivers, search, vehicleTypeFilter]);

  const vehicleTypes = useMemo(
    () =>
      Array.from(
        new Set(drivers.map((driver) => driver.vehicle_type).filter(Boolean)),
      ) as string[],
    [drivers],
  );

  const center = filteredDrivers[0]
    ? { lat: filteredDrivers[0].lat, lng: filteredDrivers[0].lng }
    : drivers[0]
      ? { lat: drivers[0].lat, lng: drivers[0].lng }
      : defaultCenter;

  return (
    <AdminModuleShell
      description="See online approved drivers with live GPS positions."
      title="Live Driver Map"
    >
      {error ? <div className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div> : null}

      <AdminFilterBar>
        <AdminFilterField label="Search">
          <input
            className={adminInputClass()}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Driver name, plate, phone..."
            value={search}
          />
        </AdminFilterField>
        <AdminFilterField label="Vehicle Type">
          <select
            className={adminInputClass()}
            onChange={(event) => setVehicleTypeFilter(event.target.value)}
            value={vehicleTypeFilter}
          >
            <option value="">All types</option>
            {vehicleTypes.map((vehicleType) => (
              <option key={vehicleType} value={vehicleType}>
                {vehicleType}
              </option>
            ))}
          </select>
        </AdminFilterField>
      </AdminFilterBar>

      <section className="mt-6 overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-sm font-bold text-slate-600">
            {filteredDrivers.length} of {drivers.length} online driver{drivers.length === 1 ? "" : "s"} shown
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Counts approved drivers marked online with a GPS ping in the last{" "}
            {liveGpsFreshMinutes} minutes
            {lastUpdatedAt
              ? ` · updated ${lastUpdatedAt.toLocaleTimeString()}`
              : ""}
          </p>
        </div>

        <AdminLiveLeafletMap center={center} drivers={filteredDrivers} />
      </section>
    </AdminModuleShell>
  );
}
