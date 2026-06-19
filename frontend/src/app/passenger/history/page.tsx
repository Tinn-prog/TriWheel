"use client";

import { useStoredTriWheelSession } from "@/app/admin/AdminAccessGate";
import { TriWheelLoadingScreen } from "@/components/TriWheelLoadingScreen";
import { apiRoutes } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

type StoredUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type Ride = {
  id: number;
  pickup_address: string;
  dropoff_address: string;
  ride_type: string | null;
  status: string;
  fare: number | null;
  created_at: string;
  driver_name: string | null;
  driver_phone: string | null;
  vehicle_type: string | null;
  plate_number: string | null;
  vehicle_color: string | null;
  rating: string | null;
  passenger_feedback: string | null;
  passenger_rated: boolean;
  driver_rating: string | null;
  driver_feedback: string | null;
  driver_rated: boolean;
};

type PassengerOverview = {
  stats: {
    total_rides: number;
    completed: number;
    cancelled: number;
    active: number;
  };
  ride_history: Ride[];
};

function statusClass(status: string) {
  if (status === "completed") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "cancelled") {
    return "bg-red-100 text-red-700";
  }

  return "bg-orange-100 text-orange-700";
}

function formatFare(fare: number | null) {
  return fare !== null ? `PHP ${fare.toFixed(2)}` : "Waiting for estimate";
}

const ratingOptions = [
  { label: "5 - Good", value: "good" },
  { label: "4 - Satisfied", value: "satisfied" },
  { label: "3 - Neutral", value: "neutral" },
  { label: "2 - Dissatisfied", value: "dissatisfied" },
  { label: "1 - Very Dissatisfied", value: "very_dissatisfied" },
];

function ratingLabel(rating: string | null) {
  return ratingOptions.find((option) => option.value === rating)?.label ?? "Not rated";
}

export default function PassengerHistoryPage() {
  const router = useRouter();
  const { isChecking, user } = useStoredTriWheelSession() as {
    isChecking: boolean;
    user: StoredUser | null;
  };
  const [overview, setOverview] = useState<PassengerOverview | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [ratingRideId, setRatingRideId] = useState<number | null>(null);

  useEffect(() => {
    if (!isChecking && user?.role !== "passenger") {
      router.replace("/login?role=passenger");
    }
  }, [isChecking, router, user]);

  const loadOverview = useCallback(async (userId: number) => {
    const response = await fetch(`${apiRoutes.passengerOverview}?user_id=${userId}`);

    if (!response.ok) {
      throw new Error("Unable to load ride history.");
    }

    setOverview((await response.json()) as PassengerOverview);
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const userId = user.id;

    async function loadHistory() {
      try {
        await loadOverview(userId);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load ride history.",
        );
      }
    }

    void loadHistory();
  }, [loadOverview, user]);

  async function handleClearHistory() {
    if (!user) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const response = await fetch(apiRoutes.passengerRideHistory, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to hide ride history.");
      }

      setNotice(data.message ?? "Ride history hidden successfully.");
      await loadOverview(user.id);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to hide ride history.",
      );
    }
  }

  async function handleRateDriver(
    event: FormEvent<HTMLFormElement>,
    rideId: number,
  ) {
    event.preventDefault();

    if (!user) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    setError("");
    setNotice("");
    setRatingRideId(rideId);

    try {
      const response = await fetch(apiRoutes.passengerRideRating(rideId), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          rating: String(formData.get("rating") ?? ""),
          feedback: String(formData.get("feedback") ?? ""),
        }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to submit feedback.");
      }

      setNotice(data.message ?? "Feedback submitted successfully.");
      form.reset();
      await loadOverview(user.id);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to submit feedback.",
      );
    } finally {
      setRatingRideId(null);
    }
  }

  if (isChecking || !user || (!overview && !error)) {
    return (
      <TriWheelLoadingScreen
        message="Loading your previous trips, fares, and ride details."
        title="Opening Ride History"
      />
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100 px-4 py-5 text-slate-950 sm:px-6 sm:py-8">
      <section className="mx-auto w-full max-w-6xl min-w-0">
        <header className="rounded-[1.75rem] bg-gradient-to-br from-orange-500 via-orange-600 to-orange-800 p-5 text-white shadow-xl shadow-orange-200 sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-100 sm:text-sm">
                Passenger Trips
              </p>
              <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
                Ride History
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-orange-50 sm:mt-3 sm:text-base">
                Review your requested, completed, and cancelled trips in one
                dedicated page.
              </p>
            </div>
            <Link
              className="inline-flex w-fit rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-orange-700 sm:px-5 sm:py-3"
              href="/passenger"
            >
              Back to Dashboard
            </Link>
          </div>
        </header>

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

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Total Rides", overview?.stats.total_rides ?? 0],
            ["Active", overview?.stats.active ?? 0],
            ["Completed", overview?.stats.completed ?? 0],
            ["Cancelled", overview?.stats.cancelled ?? 0],
          ].map(([label, value]) => (
            <article
              className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
              key={label}
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                {label}
              </p>
              <div className="mt-2 text-3xl font-black">{value}</div>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">Trip Records</h2>
              <p className="mt-1 text-sm text-slate-500">
                Completed and cancelled rides can be hidden from this page.
              </p>
            </div>
            <button
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!overview?.ride_history.some((ride) =>
                ["completed", "cancelled"].includes(ride.status),
              )}
              onClick={handleClearHistory}
              type="button"
            >
              Hide History
            </button>
          </div>

          <div className="mt-6 grid gap-4">
            {overview?.ride_history.length ? (
              overview.ride_history.map((ride) => (
                <article
                  className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
                  key={ride.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-black">Ride #{ride.id}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {new Date(ride.created_at).toLocaleString()}
                      </div>
                    </div>
                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-black ${statusClass(
                        ride.status,
                      )}`}
                    >
                      {ride.status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <p>
                      <span className="font-bold text-slate-500">Pickup:</span>{" "}
                      {ride.pickup_address}
                    </p>
                    <p>
                      <span className="font-bold text-slate-500">Drop-off:</span>{" "}
                      {ride.dropoff_address}
                    </p>
                    <p>
                      <span className="font-bold text-slate-500">Driver:</span>{" "}
                      {ride.driver_name ?? "N/A"}
                    </p>
                    <p>
                      <span className="font-bold text-slate-500">Vehicle:</span>{" "}
                      {ride.vehicle_type ?? "N/A"}
                      {ride.plate_number ? ` - ${ride.plate_number}` : ""}
                    </p>
                    <p>
                      <span className="font-bold text-slate-500">Type:</span>{" "}
                      {ride.ride_type ?? "standard"}
                    </p>
                    <p>
                      <span className="font-bold text-slate-500">Fare:</span>{" "}
                      {formatFare(ride.fare)}
                    </p>
                  </div>
                  {ride.status === "completed" && (
                    <div className="mt-5 grid gap-4 rounded-3xl bg-white p-4">
                      <div className="grid gap-3 text-sm md:grid-cols-2">
                        <div className="rounded-2xl bg-orange-50 p-4">
                          <p className="font-black text-orange-700">
                            Your Driver Rating
                          </p>
                          <p className="mt-2 font-bold text-slate-600">
                            {ratingLabel(ride.rating)}
                          </p>
                          {ride.passenger_feedback && (
                            <p className="mt-2 text-slate-500">
                              {ride.passenger_feedback}
                            </p>
                          )}
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="font-black text-slate-700">
                            Driver Feedback for You
                          </p>
                          <p className="mt-2 font-bold text-slate-600">
                            {ratingLabel(ride.driver_rating)}
                          </p>
                          {ride.driver_feedback && (
                            <p className="mt-2 text-slate-500">
                              {ride.driver_feedback}
                            </p>
                          )}
                        </div>
                      </div>

                      {!ride.passenger_rated && (
                        <form
                          className="grid gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4"
                          onSubmit={(event) => handleRateDriver(event, ride.id)}
                        >
                          <div>
                            <p className="font-black text-orange-800">
                              Rate your driver
                            </p>
                            <p className="mt-1 text-sm text-orange-700">
                              Share your experience to help improve TriWheel.
                            </p>
                          </div>
                          <select
                            className="rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-orange-400"
                            name="rating"
                            required
                          >
                            <option value="">Select rating</option>
                            {ratingOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <textarea
                            className="min-h-24 rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400"
                            name="feedback"
                            placeholder="Tell us about your ride. Optional."
                          />
                          <button
                            className="w-fit rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                            disabled={ratingRideId === ride.id}
                            type="submit"
                          >
                            {ratingRideId === ride.id
                              ? "Submitting..."
                              : "Submit Driver Feedback"}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </article>
              ))
            ) : (
              <div className="rounded-3xl bg-slate-50 p-8 text-center">
                <p className="font-black">No ride history yet.</p>
                <p className="mt-1 text-sm text-slate-500">
                  Completed and cancelled rides will appear here.
                </p>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
