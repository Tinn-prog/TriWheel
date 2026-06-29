"use client";

import { useStoredTriWheelSession } from "@/app/admin/AdminAccessGate";
import { AppShell } from "@/components/AppShell";
import { TriWheelLoadingScreen } from "@/components/TriWheelLoadingScreen";
import { apiRoutes } from "@/lib/api";
import { logoutTriWheel } from "@/lib/logout";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DriverPageHeader } from "../DriverPageHeader";
import { driverNavItems } from "../driverNav";
import { driverStatusClass } from "../driverTypes";
import { useDriverOverview } from "../useDriverOverview";

type StoredUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

function formatVehicleType(value: string) {
  if (value === "e-tricycle") {
    return "E-tricycle";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function DocumentStatus({ label, onFile }: { label: string; onFile: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <span className="text-xs font-semibold text-slate-700 sm:text-sm">{label}</span>
      <span
        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
          onFile ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
        }`}
      >
        {onFile ? "On file" : "Missing"}
      </span>
    </div>
  );
}

export default function DriverVehiclePage() {
  const router = useRouter();
  const { isChecking, user } = useStoredTriWheelSession() as {
    isChecking: boolean;
    user: StoredUser | null;
  };
  const { error, loadOverview, notice, overview, setError, setNotice } =
    useDriverOverview(user?.id);
  const [vehicleType, setVehicleType] = useState("tricycle");
  const [plateNumber, setPlateNumber] = useState("");
  const [bodyNumber, setBodyNumber] = useState("");
  const [color, setColor] = useState("");
  const [registrationExpiry, setRegistrationExpiry] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isChecking && user?.role !== "driver") {
      router.replace("/login?role=driver");
    }
  }, [isChecking, router, user]);

  useEffect(() => {
    const vehicle = overview?.driver.vehicle;

    if (!vehicle) {
      return;
    }

    setVehicleType(vehicle.vehicle_type ?? "tricycle");
    setPlateNumber(vehicle.plate_number ?? "");
    setBodyNumber(vehicle.body_number ?? "");
    setColor(vehicle.color ?? "");
    setRegistrationExpiry(vehicle.registration_expiry_date ?? "");
  }, [overview?.driver.vehicle]);

  function handleLogout() {
    void logoutTriWheel();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setIsSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(apiRoutes.driverVehicle, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body_number: bodyNumber.trim() || null,
          color: color.trim(),
          plate_number: plateNumber.trim(),
          registration_expiry_date: registrationExpiry || null,
          user_id: user.id,
          vehicle_type: vehicleType,
        }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to update vehicle information.");
      }

      setNotice(data.message ?? "Vehicle information updated.");
      await loadOverview(user.id);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update vehicle information.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isChecking || !user || (!overview && !error)) {
    return (
      <TriWheelLoadingScreen
        message="Loading your vehicle and registration details."
        title="Vehicle Information"
      />
    );
  }

  const driver = overview?.driver;
  const vehicle = driver?.vehicle;

  return (
    <AppShell
      dashboardLabel="Driver Dashboard"
      navItems={driverNavItems}
      onLogout={handleLogout}
      user={user}
    >
      <section className="mx-auto w-full max-w-4xl min-w-0">
        <DriverPageHeader
          description="View and update your tricycle details, plate number, color, and registration info."
          eyebrow="Driver Profile"
          title="Vehicle Information"
        />

        {error ? <div className="tw-alert-error mt-6">{error}</div> : null}
        {notice ? <div className="tw-alert-success mt-6">{notice}</div> : null}

        <div className="mt-4 grid gap-4 sm:mt-6">
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-900 sm:text-base">
                  Driver Profile
                </h2>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  License and TODA details from your registration.
                </p>
              </div>
              {driver ? (
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-black uppercase sm:text-xs ${driverStatusClass(
                    driver.approval_status,
                  )}`}
                >
                  {driver.approval_status}
                </span>
              ) : null}
            </div>

            <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2 sm:text-sm">
              <div>
                <dt className="font-bold text-slate-500">License number</dt>
                <dd className="mt-0.5 font-black">{driver?.license_number ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500">License expiry</dt>
                <dd className="mt-0.5 font-black">
                  {formatDate(driver?.license_expiry_date ?? null)}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500">TODA ID number</dt>
                <dd className="mt-0.5 font-black">{driver?.toda_id_number ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500">TODA association</dt>
                <dd className="mt-0.5 font-black">{driver?.toda_association ?? "—"}</dd>
              </div>
            </dl>
          </section>

          <form
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <h2 className="text-sm font-black text-slate-900 sm:text-base">
              Vehicle Details
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Passengers see your vehicle type, plate, and color when choosing a
              driver.
            </p>

            {!vehicle ? (
              <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-900 sm:text-sm">
                No vehicle on file yet. Add your details below.
              </p>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-bold sm:text-sm">
                Vehicle type
                <select
                  className="rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  onChange={(event) => setVehicleType(event.target.value)}
                  required
                  value={vehicleType}
                >
                  <option value="tricycle">Tricycle</option>
                  <option value="pedicab">Pedicab</option>
                  <option value="e-tricycle">E-tricycle</option>
                </select>
              </label>

              <label className="grid gap-1.5 text-xs font-bold sm:text-sm">
                Plate number
                <input
                  className="rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  onChange={(event) => setPlateNumber(event.target.value)}
                  placeholder="TRI-001"
                  required
                  value={plateNumber}
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold sm:text-sm">
                Body number
                <input
                  className="rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  onChange={(event) => setBodyNumber(event.target.value)}
                  placeholder="Optional"
                  value={bodyNumber}
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold sm:text-sm">
                Color
                <input
                  className="rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  onChange={(event) => setColor(event.target.value)}
                  placeholder="Orange"
                  required
                  value={color}
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold sm:col-span-2 sm:text-sm">
                Registration expiry
                <input
                  className="rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  onChange={(event) => setRegistrationExpiry(event.target.value)}
                  type="date"
                  value={registrationExpiry}
                />
              </label>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <DocumentStatus
                label="Vehicle photo"
                onFile={Boolean(vehicle?.has_vehicle_photo)}
              />
              <DocumentStatus
                label="OR/CR document"
                onFile={Boolean(vehicle?.has_orcr_file)}
              />
            </div>

            <p className="mt-3 text-[11px] leading-5 text-slate-500 sm:text-xs">
              Document uploads are managed during driver registration. Contact
              support if you need to replace a file.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                className="inline-flex min-h-9 items-center justify-center rounded-lg bg-orange-500 px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300 sm:text-sm"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Saving..." : "Save Vehicle"}
              </button>
              {vehicle?.vehicle_type ? (
                <p className="text-xs font-semibold text-slate-500">
                  Current: {formatVehicleType(vehicle.vehicle_type)}
                  {vehicle.plate_number ? ` · ${vehicle.plate_number}` : ""}
                </p>
              ) : null}
            </div>
          </form>
        </div>
      </section>
    </AppShell>
  );
}
