"use client";

import { apiRoutes } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import { AdminModuleShell, statusClass } from "../AdminModuleShell";

type Passenger = {
  id: number;
  name: string;
  email: string;
  contact_number: string | null;
  date_of_birth: string | null;
  current_address: string | null;
  profile_photo: string | null;
  government_id_type: string | null;
  government_id_file: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  safety_terms_accepted: boolean;
  is_verified: boolean;
  rides_count: number;
  submitted_at: string | null;
  created_at: string;
};

function documentStatus(filePath: string | null) {
  return filePath ? "Submitted" : "Missing";
}

export default function AdminPassengersPage() {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyPassengerId, setBusyPassengerId] = useState<number | null>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([]);

  const loadPassengers = useCallback(async () => {
    const response = await fetch(apiRoutes.adminPassengers);
    const data = (await response.json()) as {
      message?: string;
      passengers?: Passenger[];
    };

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to load passengers.");
    }

    setPassengers(data.passengers ?? []);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        await loadPassengers();
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load passengers.",
        );
      }
    }

    void load();
  }, [loadPassengers]);

  async function updatePassengerVerification(userId: number, isVerified: boolean) {
    setBusyPassengerId(userId);
    setError("");
    setNotice("");

    try {
      const response = await fetch(apiRoutes.adminPassengerVerification(userId), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_verified: isVerified }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to update passenger.");
      }

      setNotice(data.message ?? "Passenger updated successfully.");
      await loadPassengers();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update passenger.",
      );
    } finally {
      setBusyPassengerId(null);
    }
  }

  return (
    <AdminModuleShell
      description="Review passenger accounts, contact information, and ride usage."
      title="Passenger Verification"
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

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {passengers.map((passenger) => (
          <article
            className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200"
            key={passenger.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">{passenger.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{passenger.email}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  passenger.is_verified
                    ? statusClass("verified")
                    : statusClass("unverified")
                }`}
              >
                {passenger.is_verified ? "verified" : "unverified"}
              </span>
            </div>
            <div className="mt-5 grid gap-3 text-sm">
              <p>
                <span className="font-bold text-slate-500">Contact:</span>{" "}
                {passenger.contact_number ?? "N/A"}
              </p>
              <p>
                <span className="font-bold text-slate-500">Birth Date:</span>{" "}
                {passenger.date_of_birth
                  ? new Date(passenger.date_of_birth).toLocaleDateString()
                  : "N/A"}
              </p>
              <p>
                <span className="font-bold text-slate-500">Address:</span>{" "}
                {passenger.current_address ?? "N/A"}
              </p>
              <p>
                <span className="font-bold text-slate-500">Government ID:</span>{" "}
                {passenger.government_id_type ?? "N/A"}
              </p>
              <p>
                <span className="font-bold text-slate-500">Emergency Contact:</span>{" "}
                {passenger.emergency_contact_name ?? "N/A"}
              </p>
              <p>
                <span className="font-bold text-slate-500">Emergency Phone:</span>{" "}
                {passenger.emergency_contact_number ?? "N/A"}
              </p>
              <p>
                <span className="font-bold text-slate-500">Ride Count:</span>{" "}
                {passenger.rides_count}
              </p>
              <p>
                <span className="font-bold text-slate-500">Submitted:</span>{" "}
                {new Date(passenger.submitted_at ?? passenger.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="mt-5 rounded-3xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Security Checklist
              </p>
              <div className="mt-3 grid gap-2 text-sm">
                {[
                  ["Profile Photo", passenger.profile_photo],
                  ["Government ID", passenger.government_id_file],
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
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2">
                  <span className="font-bold text-slate-600">Safety Consent</span>
                  <span
                    className={`rounded-full px-2 py-1 text-[0.7rem] font-black ${
                      passenger.safety_terms_accepted
                        ? statusClass("approved")
                        : statusClass("rejected")
                    }`}
                  >
                    {passenger.safety_terms_accepted ? "Accepted" : "Missing"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={busyPassengerId === passenger.id || passenger.is_verified}
                onClick={() => updatePassengerVerification(passenger.id, true)}
                type="button"
              >
                Verify Passenger
              </button>
              <button
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busyPassengerId === passenger.id || !passenger.is_verified}
                onClick={() => updatePassengerVerification(passenger.id, false)}
                type="button"
              >
                Mark Unverified
              </button>
            </div>
          </article>
        ))}
        {!passengers.length && (
          <div className="rounded-[2rem] bg-white p-8 text-center font-black shadow-sm ring-1 ring-slate-200 md:col-span-2 xl:col-span-3">
            No passenger accounts yet.
          </div>
        )}
      </section>
    </AdminModuleShell>
  );
}
