"use client";

import { useStoredTriWheelSession } from "@/app/admin/AdminAccessGate";
import { TriWheelLoadingScreen } from "@/components/TriWheelLoadingScreen";
import { apiRoutes } from "@/lib/api";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";

const DriverRouteMap = dynamic(
  () => import("./DriverRouteMap").then((module) => module.DriverRouteMap),
  {
    loading: () => (
      <TriWheelLoadingScreen
        compact
        message="Preparing the route map for this trip."
        title="Loading map"
      />
    ),
    ssr: false,
  },
);

type StoredUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type DriverRide = {
  id: number;
  passenger_name: string | null;
  passenger_phone: string | null;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  ride_type: string | null;
  status: string;
  fare: number | null;
  created_at: string;
  driver_offer_status: string | null;
  rating: string | null;
  passenger_feedback: string | null;
  passenger_rated: boolean;
  driver_rating: string | null;
  driver_feedback: string | null;
  driver_rated: boolean;
};

type DriverOverview = {
  driver: {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    status: "online" | "offline";
    approval_status: "pending" | "approved" | "rejected";
    queue_position: number | null;
    license_number: string | null;
    vehicle_type: string | null;
    plate_number: string | null;
    vehicle_color: string | null;
  };
  active_ride: DriverRide | null;
  available_requests: DriverRide[];
  ride_history: DriverRide[];
};

function statusClass(status: string) {
  if (status === "completed" || status === "online" || status === "approved") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "cancelled" || status === "rejected") {
    return "bg-red-100 text-red-700";
  }

  return "bg-orange-100 text-orange-700";
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

export default function DriverDashboardPage() {
  const router = useRouter();
  const { isChecking, user } = useStoredTriWheelSession() as {
    isChecking: boolean;
    user: StoredUser | null;
  };
  const [overview, setOverview] = useState<DriverOverview | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyAction, setBusyAction] = useState("");

  useEffect(() => {
    if (!isChecking && user?.role !== "driver") {
      router.replace("/login?role=driver");
    }
  }, [isChecking, router, user]);

  const loadOverview = useCallback(async (userId: number) => {
    const response = await fetch(`${apiRoutes.driverOverview}?user_id=${userId}`);
    const data = (await response.json()) as DriverOverview | { message?: string };

    if (!response.ok) {
      throw new Error("message" in data ? data.message : "Unable to load driver dashboard.");
    }

    setOverview(data as DriverOverview);
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const userId = user.id;

    async function loadDashboard() {
      try {
        await loadOverview(userId);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load driver dashboard.",
        );
      }
    }

    void loadDashboard();
  }, [loadOverview, user]);

  async function runDriverAction(
    actionName: string,
    endpoint: string,
    successFallback: string,
    body: Record<string, unknown> = {},
  ) {
    if (!user) {
      return;
    }

    setError("");
    setNotice("");
    setBusyAction(actionName);

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: user.id, ...body }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? successFallback);
      }

      setNotice(data.message ?? successFallback);
      await loadOverview(user.id);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Driver action failed.",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function handleRatePassenger(
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
    setBusyAction(`rate-${rideId}`);

    try {
      const response = await fetch(apiRoutes.driverRideRating(rideId), {
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
        throw new Error(data.message ?? "Unable to submit passenger feedback.");
      }

      setNotice(data.message ?? "Passenger feedback submitted successfully.");
      form.reset();
      await loadOverview(user.id);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to submit passenger feedback.",
      );
    } finally {
      setBusyAction("");
    }
  }

  function handleLogout() {
    localStorage.removeItem("triwheel_user");
    window.dispatchEvent(new Event("triwheel_user_change"));
    router.replace("/login?role=driver");
  }

  if (isChecking || !user) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-6">
        <div className="rounded-[2rem] bg-white p-8 text-center shadow-xl">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-600">
            Driver Access
          </p>
          <h1 className="mt-3 text-3xl font-black">Checking session...</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white p-6 lg:block">
        <Link className="text-2xl font-black" href="/">
          TriWheel
        </Link>
        <p className="mt-2 text-sm text-slate-500">Driver Dashboard</p>

        <nav className="mt-10 grid gap-3 text-sm font-bold">
          {[
            ["Status", "#status"],
            ["Ride Requests", "#requests"],
            ["Active Ride", "#active-ride"],
            ["History", "#history"],
            ["Vehicle", "/driver/vehicle"],
          ].map(([label, href]) => (
            <Link
              className="rounded-2xl px-4 py-3 text-slate-600 transition hover:bg-orange-50 hover:text-orange-700"
              href={href}
              key={href}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6 rounded-3xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-600">
            Signed in as
          </p>
          <div className="mt-3 font-black">{user.name}</div>
          <div className="mt-1 break-all text-xs text-slate-500">{user.email}</div>
          <button
            className="mt-4 w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white"
            onClick={handleLogout}
            type="button"
          >
            Logout
          </button>
        </div>
      </aside>

      <section className="w-full min-w-0 px-4 py-5 sm:px-6 sm:py-8 lg:ml-72 lg:w-auto">
        <header className="rounded-[1.75rem] bg-gradient-to-br from-orange-500 to-orange-700 p-5 text-white shadow-xl shadow-orange-200 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-100 sm:text-sm">
            Driver Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:mt-4 sm:text-4xl">
            Welcome, {overview?.driver.name ?? user.name}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-orange-50 sm:mt-3 sm:text-base">
            Go online, send offers to passengers, and manage trips after a
            passenger chooses you.
          </p>
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

        {!overview ? (
          <div className="mt-8 rounded-[2rem] bg-white p-8 text-center font-black shadow-sm ring-1 ring-slate-200">
            Loading driver dashboard...
          </div>
        ) : (
          <>
            {overview.driver.approval_status !== "approved" && (
              <div className="mt-8 rounded-2xl bg-amber-50 p-5 font-bold text-amber-800">
                Verification status: {overview.driver.approval_status}. You can
                go online once an admin approves your driver profile.
              </div>
            )}

            <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Status", overview.driver.status],
                ["Open Requests", overview.available_requests.length],
                [
                  "Offers Sent",
                  overview.available_requests.filter((ride) => ride.driver_offer_status)
                    .length,
                ],
                ["Vehicle", overview.driver.plate_number ?? "No plate"],
              ].map(([label, value]) => (
                <article
                  className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
                  key={label}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    {label}
                  </p>
                  <div className="mt-2 text-2xl font-black sm:text-3xl">
                    {value}
                  </div>
                </article>
              ))}
            </section>

            <section className="mt-8 grid min-w-0 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              <article
                className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200"
                id="status"
              >
                <h2 className="text-2xl font-black">Driver Status</h2>
                <span
                  className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black ${statusClass(
                    overview.driver.status,
                  )}`}
                >
                  {overview.driver.status}
                </span>
                <p className="mt-4 text-sm text-slate-600">
                  {overview.driver.status === "online"
                    ? "You are online and can send offers to open passenger requests."
                    : "You are offline and not receiving ride requests."}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={
                      overview.driver.approval_status !== "approved" ||
                      busyAction === "status-online"
                    }
                    onClick={() =>
                      runDriverAction(
                        "status-online",
                        apiRoutes.driverStatus,
                        "You are now online.",
                        { status: "online" },
                      )
                    }
                    type="button"
                  >
                    Go Online
                  </button>
                  <button
                    className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={busyAction === "status-offline"}
                    onClick={() =>
                      runDriverAction(
                        "status-offline",
                        apiRoutes.driverStatus,
                        "You are now offline.",
                        { status: "offline" },
                      )
                    }
                    type="button"
                  >
                    Go Offline
                  </button>
                </div>
              </article>

              <article
                className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200"
                id="active-ride"
              >
                <h2 className="text-2xl font-black">Active Ride</h2>
                {overview.active_ride ? (
                  (() => {
                    const activeRide = overview.active_ride;

                    return (
                      <RideCard
                        action={
                          activeRide.status === "accepted" ? (
                            <button
                              className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white"
                              onClick={() =>
                                runDriverAction(
                                  `start-${activeRide.id}`,
                                  apiRoutes.driverRideStart(activeRide.id),
                                  "Ride started successfully.",
                                )
                              }
                              type="button"
                            >
                              Start Ride
                            </button>
                          ) : (
                            <button
                              className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white"
                              onClick={() =>
                                runDriverAction(
                                  `complete-${activeRide.id}`,
                                  apiRoutes.driverRideComplete(activeRide.id),
                                  "Ride completed successfully.",
                                )
                              }
                              type="button"
                            >
                              Complete Ride
                            </button>
                          )
                        }
                        secondaryAction={
                          <button
                            className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white"
                            onClick={() =>
                              runDriverAction(
                                `cancel-${activeRide.id}`,
                                apiRoutes.driverRideCancel(activeRide.id),
                                "Ride cancelled successfully.",
                              )
                            }
                            type="button"
                          >
                            Cancel Ride
                          </button>
                        }
                        ride={activeRide}
                        showMap
                      />
                    );
                  })()
                ) : (
                  <div className="mt-6 rounded-3xl bg-slate-50 p-8 text-center">
                    <p className="font-black">No active ride.</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Send an offer and wait for the passenger to choose you.
                    </p>
                  </div>
                )}
              </article>
            </section>

            <section
              className="mt-8 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200"
              id="requests"
            >
              <h2 className="text-2xl font-black">Ride Requests</h2>
              <p className="mt-2 text-sm text-slate-500">
                Send an offer for rides you can take. The passenger will choose
                from the drivers who offered.
              </p>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {overview.available_requests.length ? (
                  overview.available_requests.map((ride) => (
                    <RideCard
                      action={
                        <button
                          className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                          disabled={
                            overview.driver.status !== "online" ||
                            Boolean(overview.active_ride) ||
                            Boolean(ride.driver_offer_status)
                          }
                          onClick={() =>
                            runDriverAction(
                              `offer-${ride.id}`,
                              apiRoutes.driverRideOffer(ride.id),
                              "Offer sent to passenger successfully.",
                            )
                          }
                          type="button"
                        >
                          {ride.driver_offer_status === "pending"
                            ? "Offer Sent"
                            : "Send Offer"}
                        </button>
                      }
                      key={ride.id}
                      ride={ride}
                      showMap
                    />
                  ))
                ) : (
                  <div className="rounded-3xl bg-slate-50 p-8 text-center lg:col-span-2">
                    <p className="font-black">No ride requests yet.</p>
                  </div>
                )}
              </div>
            </section>

            <section
              className="mt-8 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200"
              id="history"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-black">Ride History</h2>
                <button
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!overview.ride_history.some((ride) =>
                    ["completed", "cancelled"].includes(ride.status),
                  )}
                  onClick={() =>
                    runDriverAction(
                      "clear-history",
                      apiRoutes.driverRideHistory,
                      "Ride history hidden successfully.",
                    )
                  }
                  type="button"
                >
                  Hide History
                </button>
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {overview.ride_history.length ? (
                  overview.ride_history.map((ride) => (
                    <RideCard
                      action={
                        ride.status === "completed" && !ride.driver_rated ? (
                          <DriverRatingForm
                            isSubmitting={busyAction === `rate-${ride.id}`}
                            onSubmit={(event) =>
                              handleRatePassenger(event, ride.id)
                            }
                          />
                        ) : undefined
                      }
                      key={ride.id}
                      ride={ride}
                    />
                  ))
                ) : (
                  <div className="rounded-3xl bg-slate-50 p-8 text-center lg:col-span-2">
                    <p className="font-black">No ride history yet.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function RideCard({
  action,
  ride,
  secondaryAction,
  showMap = false,
}: {
  action?: ReactNode;
  ride: DriverRide;
  secondaryAction?: ReactNode;
  showMap?: boolean;
}) {
  const hasRouteCoordinates =
    ride.pickup_lat !== null &&
    ride.pickup_lng !== null &&
    ride.dropoff_lat !== null &&
    ride.dropoff_lng !== null;
  const pickupPoint = hasRouteCoordinates
    ? { lat: ride.pickup_lat as number, lng: ride.pickup_lng as number }
    : null;
  const dropoffPoint = hasRouteCoordinates
    ? { lat: ride.dropoff_lat as number, lng: ride.dropoff_lng as number }
    : null;

  return (
    <article className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
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
          <span className="font-bold text-slate-500">Passenger:</span>{" "}
          {ride.passenger_name ?? "Passenger"}
        </p>
        <p>
          <span className="font-bold text-slate-500">Phone:</span>{" "}
          {ride.passenger_phone ?? "N/A"}
        </p>
        <p>
          <span className="font-bold text-slate-500">Pickup:</span>{" "}
          {ride.pickup_address}
        </p>
        <p>
          <span className="font-bold text-slate-500">Drop-off:</span>{" "}
          {ride.dropoff_address}
        </p>
        <p>
          <span className="font-bold text-slate-500">Type:</span>{" "}
          {ride.ride_type ?? "standard"}
        </p>
        <p>
          <span className="font-bold text-slate-500">Fare:</span>{" "}
          {ride.fare !== null ? `PHP ${ride.fare.toFixed(2)}` : "Not set"}
        </p>
        {ride.driver_offer_status && (
          <p>
            <span className="font-bold text-slate-500">Your Offer:</span>{" "}
            {ride.driver_offer_status}
          </p>
        )}
      </div>
      {ride.status === "completed" && (
        <div className="mt-5 grid gap-3 rounded-3xl bg-white p-4 text-sm md:grid-cols-2">
          <div className="rounded-2xl bg-orange-50 p-4">
            <p className="font-black text-orange-700">Passenger Rating for You</p>
            <p className="mt-2 font-bold text-slate-600">
              {ratingLabel(ride.rating)}
            </p>
            {ride.passenger_feedback && (
              <p className="mt-2 text-slate-500">{ride.passenger_feedback}</p>
            )}
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-black text-slate-700">Your Passenger Rating</p>
            <p className="mt-2 font-bold text-slate-600">
              {ratingLabel(ride.driver_rating)}
            </p>
            {ride.driver_feedback && (
              <p className="mt-2 text-slate-500">{ride.driver_feedback}</p>
            )}
          </div>
        </div>
      )}
      {showMap && pickupPoint && dropoffPoint && (
        <div className="mt-5">
          <DriverRouteMap dropoff={dropoffPoint} pickup={pickupPoint} />
        </div>
      )}
      {showMap && !hasRouteCoordinates && (
        <div className="mt-5 rounded-3xl bg-white p-4 text-sm font-bold text-slate-500">
          Route map will appear when pickup and drop-off pins are available.
        </div>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </article>
  );
}

function DriverRatingForm({
  isSubmitting,
  onSubmit,
}: {
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      className="grid w-full gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4"
      onSubmit={onSubmit}
    >
      <div>
        <p className="font-black text-orange-800">Rate this passenger</p>
        <p className="mt-1 text-sm text-orange-700">
          Share your experience to help keep the TriWheel community safe.
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
        placeholder="How was this passenger? Optional."
      />
      <button
        className="w-fit rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Submitting..." : "Submit Passenger Feedback"}
      </button>
    </form>
  );
}
