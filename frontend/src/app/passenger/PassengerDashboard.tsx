"use client";

import { useStoredTriWheelSession } from "@/app/admin/AdminAccessGate";
import { TriWheelLoadingScreen } from "@/components/TriWheelLoadingScreen";
import { apiRoutes } from "@/lib/api";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { Point } from "./RideRequestMap";

const RideRequestMap = dynamic(
  () => import("./RideRequestMap").then((module) => module.RideRequestMap),
  {
    loading: () => (
      <TriWheelLoadingScreen
        compact
        message="Preparing the map so you can set accurate pickup and drop-off pins."
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

type PlaceSuggestion = {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
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
  offers: RideOffer[];
};

type RideOffer = {
  id: number;
  status: string;
  driver_id: number;
  driver_name: string | null;
  driver_phone: string | null;
  driver_status: string | null;
  vehicle_type: string | null;
  plate_number: string | null;
  vehicle_color: string | null;
  created_at: string;
};

type PassengerOverview = {
  passenger: {
    id: number;
    name: string;
    email: string;
    contact_number: string | null;
  };
  active_ride: Ride | null;
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

function statusLabel(status: string) {
  return status
    .split("_")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function formatFare(fare: number | null) {
  return fare !== null ? `PHP ${fare.toFixed(2)}` : "Waiting for estimate";
}

const bookingSteps = [
  {
    label: "Set trip",
    description: "Enter pickup, drop-off, and optional map pins.",
  },
  {
    label: "Review offers",
    description: "Nearby online drivers can send offers for your ride.",
  },
  {
    label: "Choose driver",
    description: "Pick the driver and vehicle that feels right.",
  },
];

const rideProgress = [
  { key: "requested", label: "Finding offers" },
  { key: "accepted", label: "Driver matched" },
  { key: "ongoing", label: "On trip" },
  { key: "completed", label: "Completed" },
];

function tripTrackingCopy(status: string, offerCount: number) {
  if (status === "requested") {
    return {
      action: offerCount > 0 ? "Choose your driver" : "Wait for driver offers",
      description:
        offerCount > 0
          ? "Drivers are ready. Compare the offers and choose the one you prefer."
          : "Your request is live. Online drivers can now send offers for this ride.",
      title: offerCount > 0 ? `${offerCount} driver offer${offerCount > 1 ? "s" : ""}` : "Finding nearby drivers",
    };
  }

  if (status === "accepted") {
    return {
      action: "Meet your driver at pickup",
      description:
        "Your selected driver has accepted the trip. Stay near the pickup point and keep your phone available.",
      title: "Driver is assigned",
    };
  }

  if (status === "ongoing") {
    return {
      action: "Enjoy your ride",
      description:
        "Your trip is now in progress. You can review the trip details here anytime.",
      title: "Trip in progress",
    };
  }

  if (status === "completed") {
    return {
      action: "Trip completed",
      description: "Thanks for riding with TriWheel. Your trip is saved in history.",
      title: "Arrived safely",
    };
  }

  return {
    action: "Check trip status",
    description: "Your latest trip status is shown below.",
    title: statusLabel(status),
  };
}

async function searchPlaces(query: string, signal: AbortSignal) {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 3) {
    return [];
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=ph&q=${encodeURIComponent(
      `${normalizedQuery}, Philippines`,
    )}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error("Unable to search places right now.");
  }

  return (await response.json()) as PlaceSuggestion[];
}

const passengerNavItems = [
  { href: "/passenger#book-ride", label: "Book Ride" },
  { href: "/passenger#active-ride", label: "Active Ride" },
  { href: "/passenger/history", label: "Ride History" },
  { href: "/settings", label: "Profile" },
];

export function PassengerDashboard() {
  const router = useRouter();
  const { isChecking, user } = useStoredTriWheelSession() as {
    isChecking: boolean;
    user: StoredUser | null;
  };
  const [overview, setOverview] = useState<PassengerOverview | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmittingRide, setIsSubmittingRide] = useState(false);
  const [isCancellingRide, setIsCancellingRide] = useState(false);
  const [choosingOfferId, setChoosingOfferId] = useState<number | null>(null);
  const [rideType, setRideType] = useState("tricycle");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [pickupPoint, setPickupPoint] = useState<Point | null>(null);
  const [dropoffPoint, setDropoffPoint] = useState<Point | null>(null);
  const [pickupSuggestions, setPickupSuggestions] = useState<PlaceSuggestion[]>(
    [],
  );
  const [dropoffSuggestions, setDropoffSuggestions] = useState<
    PlaceSuggestion[]
  >([]);
  const [placeSearchStatus, setPlaceSearchStatus] = useState("");

  useEffect(() => {
    if (!isChecking && user?.role !== "passenger") {
      router.replace("/login?role=passenger");
    }
  }, [isChecking, router, user]);

  const loadOverview = useCallback(async (userId: number) => {
    const response = await fetch(`${apiRoutes.passengerOverview}?user_id=${userId}`);

    if (!response.ok) {
      throw new Error("Unable to load passenger dashboard.");
    }

    setOverview((await response.json()) as PassengerOverview);
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
            : "Unable to load passenger dashboard.",
        );
      }
    }

    void loadDashboard();
  }, [loadOverview, user]);

  useEffect(() => {
    const query = pickupAddress.trim();

    if (query.length < 3 || pickupPoint) {
      return;
    }

    const abortController = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setPlaceSearchStatus("Searching pickup suggestions...");
        setPickupSuggestions(await searchPlaces(query, abortController.signal));
        setPlaceSearchStatus("");
      } catch (caughtError) {
        if (!abortController.signal.aborted) {
          setPickupSuggestions([]);
          setPlaceSearchStatus(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to search pickup.",
          );
        }
      }
    }, 450);

    return () => {
      abortController.abort();
      window.clearTimeout(timeout);
    };
  }, [pickupAddress, pickupPoint]);

  useEffect(() => {
    const query = dropoffAddress.trim();

    if (query.length < 3 || dropoffPoint) {
      return;
    }

    const abortController = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setPlaceSearchStatus("Searching drop-off suggestions...");
        setDropoffSuggestions(await searchPlaces(query, abortController.signal));
        setPlaceSearchStatus("");
      } catch (caughtError) {
        if (!abortController.signal.aborted) {
          setDropoffSuggestions([]);
          setPlaceSearchStatus(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to search drop-off.",
          );
        }
      }
    }, 450);

    return () => {
      abortController.abort();
      window.clearTimeout(timeout);
    };
  }, [dropoffAddress, dropoffPoint]);

  async function handleRideRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setError("");
    setNotice("");
    setIsSubmittingRide(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      user_id: user.id,
      pickup_address: String(formData.get("pickup_address") ?? ""),
      dropoff_address: String(formData.get("dropoff_address") ?? ""),
      ride_type: String(formData.get("ride_type") ?? "tricycle"),
      pickup_lat: formData.get("pickup_lat") || null,
      pickup_lng: formData.get("pickup_lng") || null,
      dropoff_lat: formData.get("dropoff_lat") || null,
      dropoff_lng: formData.get("dropoff_lng") || null,
    };

    try {
      const response = await fetch(apiRoutes.passengerRides, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to request ride.");
      }

      setNotice(data.message ?? "Ride requested successfully.");
      form.reset();
      setPickupAddress("");
      setDropoffAddress("");
      setRideType("tricycle");
      setPickupPoint(null);
      setDropoffPoint(null);
      await loadOverview(user.id);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to request ride.",
      );
    } finally {
      setIsSubmittingRide(false);
    }
  }

  async function handleCancelRide() {
    if (!user || !overview?.active_ride) {
      return;
    }

    setError("");
    setNotice("");
    setIsCancellingRide(true);

    try {
      const response = await fetch(apiRoutes.rideCancel(overview.active_ride.id), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to cancel ride.");
      }

      setNotice(data.message ?? "Ride cancelled successfully.");
      await loadOverview(user.id);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to cancel ride.",
      );
    } finally {
      setIsCancellingRide(false);
    }
  }

  async function handleChooseOffer(offerId: number) {
    if (!user) {
      return;
    }

    setError("");
    setNotice("");
    setChoosingOfferId(offerId);

    try {
      const response = await fetch(apiRoutes.passengerRideOfferChoose(offerId), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to choose driver.");
      }

      setNotice(data.message ?? "Driver selected successfully.");
      await loadOverview(user.id);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to choose driver.",
      );
    } finally {
      setChoosingOfferId(null);
    }
  }

  function selectPickupSuggestion(suggestion: PlaceSuggestion) {
    setPickupAddress(suggestion.display_name);
    setPickupPoint({
      lat: Number(suggestion.lat),
      lng: Number(suggestion.lon),
    });
    setPickupSuggestions([]);
    setPlaceSearchStatus("");
  }

  function selectDropoffSuggestion(suggestion: PlaceSuggestion) {
    setDropoffAddress(suggestion.display_name);
    setDropoffPoint({
      lat: Number(suggestion.lat),
      lng: Number(suggestion.lon),
    });
    setDropoffSuggestions([]);
    setPlaceSearchStatus("");
  }

  function useCurrentLocationAsPickup() {
    if (!navigator.geolocation) {
      setPlaceSearchStatus("Your browser does not support current location.");
      return;
    }

    setPlaceSearchStatus("Getting your current location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPickupPoint({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setPickupAddress("Current location");
        setPickupSuggestions([]);
        setPlaceSearchStatus("");
      },
      () => {
        setPlaceSearchStatus(
          "Unable to get your current location. Please allow location access.",
        );
      },
    );
  }

  function handleLogout() {
    localStorage.removeItem("triwheel_user");
    window.dispatchEvent(new Event("triwheel_user_change"));
    router.replace("/login?role=passenger");
  }

  if (isChecking || !user) {
    return (
      <TriWheelLoadingScreen
        message="Checking your passenger session and keeping your dashboard secure."
        title="Opening Passenger Dashboard"
      />
    );
  }

  if (!overview && !error) {
    return (
      <TriWheelLoadingScreen
        message="Loading your rides, active trip, driver offers, and history."
        title="Getting your dashboard ready"
      />
    );
  }

  const activeRide = overview?.active_ride ?? null;
  const hasActiveRide = Boolean(activeRide);
  const canRequestRide = !hasActiveRide && !isSubmittingRide;
  const pendingOfferCount = activeRide?.offers.length ?? 0;
  const activeTripTracking = activeRide
    ? tripTrackingCopy(activeRide.status, pendingOfferCount)
    : null;

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white p-6 lg:block">
        <Link className="text-2xl font-black" href="/">
          TriWheel
        </Link>
        <p className="mt-2 text-sm text-slate-500">Passenger Dashboard</p>

        <nav className="mt-10 grid gap-3 text-sm font-bold">
          {passengerNavItems.map((item) => (
            <Link
              className="rounded-2xl px-4 py-3 text-slate-600 transition hover:bg-orange-50 hover:text-orange-700"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6 rounded-3xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-600">
            Signed in as
          </p>
          <div className="mt-3 font-black">{user.name}</div>
          <div className="mt-1 break-all text-xs text-slate-500">
            {user.email}
          </div>
          <button
            className="mt-4 w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20"
            onClick={handleLogout}
            type="button"
          >
            Logout
          </button>
        </div>
      </aside>

      <section className="w-full min-w-0 px-4 py-4 sm:px-6 sm:py-6 lg:ml-72 lg:w-auto">
        <header className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-orange-500 via-orange-600 to-orange-800 p-5 text-white shadow-xl shadow-orange-200 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-100">
            Passenger Dashboard
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="text-3xl font-black leading-tight sm:text-4xl">
                Welcome, {overview?.passenger.name ?? user.name}.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-orange-50">
                Book a ride, compare driver offers, choose your driver, and
                track your trip from one clean dashboard.
              </p>
            </div>
            <a
              className="inline-flex w-fit rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-orange-700 shadow-lg shadow-orange-950/10"
              href={hasActiveRide ? "#active-ride" : "#book-ride"}
            >
              {hasActiveRide ? "View Active Ride" : "Book a Ride"}
            </a>
          </div>
          {activeRide && activeTripTracking ? (
            <div className="mt-5 rounded-3xl bg-white p-3 text-slate-950 shadow-xl shadow-orange-950/10">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex gap-3">
                  <div className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/30">
                    <span className="absolute inline-flex size-12 animate-ping rounded-2xl bg-orange-400 opacity-25" />
                    <span className="relative text-lg font-black">TW</span>
                  </div>
                  <div>
                    <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-orange-600">
                      Live trip tracking
                    </p>
                    <h2 className="mt-1 text-xl font-black">
                      {activeTripTracking.title}
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">
                      {activeTripTracking.description}
                    </p>
                  </div>
                </div>
                <a
                  className="inline-flex w-fit rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
                  href="#active-ride"
                >
                  {activeTripTracking.action}
                </a>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                {rideProgress.map((step) => {
                  const currentIndex = rideProgress.findIndex(
                    (item) => item.key === activeRide.status,
                  );
                  const stepIndex = rideProgress.findIndex(
                    (item) => item.key === step.key,
                  );
                  const isComplete = currentIndex >= 0 && stepIndex <= currentIndex;

                  return (
                    <div
                      className={`rounded-2xl px-3 py-2 text-center text-xs font-black ${
                        isComplete
                          ? "bg-orange-500 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                      key={step.key}
                    >
                      {step.label}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-2 rounded-3xl bg-white/10 p-2 backdrop-blur sm:grid-cols-3">
              {bookingSteps.map((step, index) => (
                <div className="rounded-2xl bg-white/10 p-3" key={step.label}>
                  <div className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-orange-100">
                    Step {index + 1}
                  </div>
                  <div className="mt-1 text-sm font-black">{step.label}</div>
                  <p className="mt-1 text-xs leading-5 text-orange-50">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          )}
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

        <section className="mt-6 grid min-w-0 gap-6">
          <article
            className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200"
            id="book-ride"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-orange-600">
                  Book now
                </p>
                <h2 className="mt-2 text-3xl font-black">Request a Ride</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Add the places, drop pins for better accuracy, then wait for
                  driver offers before choosing who takes the trip.
                </p>
              </div>
              <span className="w-fit rounded-full bg-orange-100 px-4 py-2 text-xs font-black text-orange-700">
                {hasActiveRide ? "Ride active" : "Ready"}
              </span>
            </div>

            {hasActiveRide && (
              <div className="mt-5 rounded-3xl bg-amber-50 p-4 text-sm font-bold text-amber-800">
                You already have an active ride. Finish, complete, or cancel it
                before requesting a new one.
              </div>
            )}

            <form className="mt-6 grid gap-4" onSubmit={handleRideRequest}>
              <fieldset
                className="grid gap-4 disabled:opacity-60 xl:grid-cols-[0.85fr_1.15fr]"
                disabled={!canRequestRide}
              >
                <div className="grid content-start gap-4">
                  <div className="grid gap-3 rounded-3xl bg-slate-50 p-4">
                    <label className="grid gap-2 text-sm font-bold">
                      Pickup location
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        name="pickup_address"
                        onChange={(event) => {
                          const value = event.target.value;

                          setPickupAddress(value);
                          setPickupPoint(null);
                          if (value.trim().length < 3) {
                            setPickupSuggestions([]);
                          }
                        }}
                        placeholder="Where should we pick you up?"
                        required
                        type="text"
                        value={pickupAddress}
                      />
                      <button
                        className="mt-1 w-fit rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-xs font-black text-orange-700 transition hover:border-orange-300 hover:bg-orange-100"
                        onClick={useCurrentLocationAsPickup}
                        type="button"
                      >
                        Use my current location as pickup
                      </button>
                      {pickupSuggestions.length > 0 && (
                        <div className="grid gap-2 rounded-2xl border border-orange-100 bg-white p-2 shadow-lg shadow-orange-100">
                          {pickupSuggestions.map((suggestion) => (
                            <button
                              className="rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 transition hover:bg-orange-50 hover:text-orange-700"
                              key={suggestion.place_id}
                              onClick={() => selectPickupSuggestion(suggestion)}
                              type="button"
                            >
                              {suggestion.display_name}
                            </button>
                          ))}
                        </div>
                      )}
                    </label>
                    <label className="grid gap-2 text-sm font-bold">
                      Drop-off location
                      <input
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        name="dropoff_address"
                        onChange={(event) => {
                          const value = event.target.value;

                          setDropoffAddress(value);
                          setDropoffPoint(null);
                          if (value.trim().length < 3) {
                            setDropoffSuggestions([]);
                          }
                        }}
                        placeholder="Where are you going?"
                        required
                        type="text"
                        value={dropoffAddress}
                      />
                      {dropoffSuggestions.length > 0 && (
                        <div className="grid gap-2 rounded-2xl border border-orange-100 bg-white p-2 shadow-lg shadow-orange-100">
                          {dropoffSuggestions.map((suggestion) => (
                            <button
                              className="rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 transition hover:bg-orange-50 hover:text-orange-700"
                              key={suggestion.place_id}
                              onClick={() => selectDropoffSuggestion(suggestion)}
                              type="button"
                            >
                              {suggestion.display_name}
                            </button>
                          ))}
                        </div>
                      )}
                    </label>
                    {placeSearchStatus && (
                      <p className="rounded-2xl bg-orange-50 px-4 py-3 text-xs font-bold text-orange-800">
                        {placeSearchStatus}
                      </p>
                    )}
                    <label className="grid gap-2 text-sm font-bold">
                      Ride type
                      <select
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        name="ride_type"
                        onChange={(event) => setRideType(event.target.value)}
                        value={rideType}
                      >
                        <option value="tricycle">Tricycle</option>
                        <option value="pedicab">Pedicab</option>
                        <option value="e-tricycle">E-tricycle</option>
                      </select>
                    </label>
                  </div>

                  <button
                    className="rounded-2xl bg-slate-950 px-6 py-4 font-black text-white shadow-lg shadow-slate-300 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                    disabled={!canRequestRide}
                    type="submit"
                  >
                    {isSubmittingRide
                      ? "Sending request..."
                      : hasActiveRide
                        ? "Active Ride in Progress"
                        : "Find Drivers"}
                  </button>
                </div>

                <RideRequestMap
                  dropoffLabel={dropoffAddress}
                  pickupLabel={pickupAddress}
                  rideType={rideType}
                  selectedDropoff={dropoffPoint}
                  selectedPickup={pickupPoint}
                />
              </fieldset>
            </form>
          </article>

          {overview?.active_ride &&
            (() => {
                const activeRide = overview.active_ride;
                const tracking = tripTrackingCopy(
                  activeRide.status,
                  activeRide.offers.length,
                );

                return (
                  <article
                    className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200"
                    id="active-ride"
                  >
                    <h2 className="text-2xl font-black">Active Ride</h2>
                    <div className="mt-6 overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl shadow-slate-200">
                      <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-800 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-bold uppercase tracking-[0.22em] text-orange-100">
                            Trip #{activeRide.id}
                          </p>
                          <h3 className="mt-2 text-2xl font-black">
                            {tracking.title}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-orange-50">
                            {tracking.description}
                          </p>
                        </div>
                        <span
                          className={`w-fit rounded-full px-3 py-1 text-xs font-black ${statusClass(
                            activeRide.status,
                          )}`}
                        >
                          {statusLabel(activeRide.status)}
                        </span>
                      </div>

                      <div className="mt-5 grid gap-2 sm:grid-cols-4">
                        {rideProgress.map((step) => {
                          const currentIndex = rideProgress.findIndex(
                            (item) => item.key === activeRide.status,
                          );
                          const stepIndex = rideProgress.findIndex(
                            (item) => item.key === step.key,
                          );
                          const isComplete =
                            currentIndex >= 0 && stepIndex <= currentIndex;

                          return (
                            <div
                              className={`rounded-2xl p-3 text-xs font-black ${
                                isComplete
                                  ? "bg-white text-orange-700"
                                  : "bg-white/15 text-orange-50"
                              }`}
                              key={step.key}
                            >
                              {step.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                      <div className="grid gap-4 bg-white p-5 text-slate-950">
                      <div className="rounded-3xl bg-slate-50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                          Pickup
                        </p>
                        <p className="mt-2 font-black">
                          {activeRide.pickup_address}
                        </p>
                      </div>
                      <div className="rounded-3xl bg-slate-50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                          Drop-off
                        </p>
                        <p className="mt-2 font-black">
                          {activeRide.dropoff_address}
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-orange-50 p-4 text-sm">
                          <p className="font-bold text-slate-500">Driver</p>
                          <p className="mt-1 font-black">
                            {activeRide.driver_name ?? "Waiting for driver"}
                          </p>
                          {activeRide.driver_phone && (
                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {activeRide.driver_phone}
                            </p>
                          )}
                        </div>
                        <div className="rounded-2xl bg-emerald-50 p-4 text-sm">
                          <p className="font-bold text-slate-500">Fare</p>
                          <p className="mt-1 font-black text-emerald-700">
                            {formatFare(activeRide.fare)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                          <p className="font-bold text-slate-500">Offers</p>
                          <p className="mt-1 font-black text-slate-950">
                            {pendingOfferCount}
                          </p>
                        </div>
                      </div>
                    </div>
                    {activeRide.status === "requested" && (
                      <div className="m-5 mt-0 rounded-3xl bg-white p-4 text-slate-950">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-600">
                              Choose your match
                            </p>
                            <h3 className="mt-1 text-xl font-black">
                              Driver Offers
                            </h3>
                            <p className="text-sm text-slate-500">
                              Compare available drivers before confirming your
                              trip.
                            </p>
                          </div>
                          <button
                            className="w-fit rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-500/20 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                            disabled={isCancellingRide}
                            onClick={handleCancelRide}
                            type="button"
                          >
                            {isCancellingRide ? "Cancelling..." : "Cancel Ride"}
                          </button>
                        </div>

                        <div className="mt-4 grid gap-3">
                          {activeRide.offers.length ? (
                            activeRide.offers.map((offer) => (
                              <article
                                className="rounded-3xl border border-slate-100 bg-slate-50 p-4 transition hover:border-orange-200 hover:bg-orange-50/60"
                                key={offer.id}
                              >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="flex gap-3">
                                    <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-orange-500 font-black text-white shadow-lg shadow-orange-500/20">
                                      {(offer.driver_name ?? "D").charAt(0)}
                                    </div>
                                    <div>
                                      <div className="font-black">
                                        {offer.driver_name ?? "Driver"}
                                      </div>
                                      <div className="mt-1 text-sm text-slate-500">
                                        {offer.vehicle_type ?? "Vehicle"}{" "}
                                        {offer.plate_number
                                          ? `• ${offer.plate_number}`
                                          : ""}
                                      </div>
                                      <div className="mt-1 text-sm text-slate-500">
                                        {offer.vehicle_color
                                          ? `${offer.vehicle_color} vehicle`
                                          : "Vehicle color not set"}
                                      </div>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-orange-600">
                                          {offer.driver_status ?? "online"}
                                        </span>
                                        {offer.driver_phone && (
                                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                                            {offer.driver_phone}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-2 sm:items-end">
                                    <div className="text-sm font-black text-emerald-700">
                                      {formatFare(activeRide.fare)}
                                    </div>
                                    <button
                                      className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                                      disabled={choosingOfferId === offer.id}
                                      onClick={() => handleChooseOffer(offer.id)}
                                      type="button"
                                    >
                                      {choosingOfferId === offer.id
                                        ? "Choosing..."
                                        : "Choose Driver"}
                                    </button>
                                  </div>
                                </div>
                              </article>
                            ))
                          ) : (
                            <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
                              Waiting for nearby drivers to send offers.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    </div>
                  </article>
                );
              })()}
        </section>

      </section>
    </main>
  );
}
