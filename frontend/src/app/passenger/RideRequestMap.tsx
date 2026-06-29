"use client";

import {
  resolveDriverMapRoute,
} from "@/lib/driverMapRoute";
import {
  defaultMapCenter,
  estimateFare,
  type Point,
  type RouteSummary,
} from "@/lib/mapTypes";
import { pointsFitKey } from "@/lib/mapUtils";
import { looksLikeCoordinates } from "@/hooks/useGeocoder";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

const RideRequestLeafletMap = dynamic(
  () =>
    import("@/components/leaflet/RideRequestLeafletMap").then(
      (module) => module.RideRequestLeafletMap,
    ),
  {
    loading: () => (
      <div className="grid h-80 place-items-center text-sm font-semibold text-slate-500">
        Loading map...
      </div>
    ),
    ssr: false,
  },
);

type SelectionMode = "pickup" | "dropoff";

type ActiveRideMapData = {
  driver_lat: number | null;
  driver_lng: number | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  status: string;
};

function formatLocationLabel(label: string, fallback: string) {
  if (!label.trim() || looksLikeCoordinates(label)) {
    return fallback;
  }

  return label;
}

export function RideRequestMap({
  activeRide = null,
  dropoffLabel = "",
  onDropoffSelect,
  onPickupSelect,
  pickupLabel = "",
  rideType = "tricycle",
  selectedDropoff,
  selectedPickup,
}: {
  activeRide?: ActiveRideMapData | null;
  dropoffLabel?: string;
  onDropoffSelect?: (point: Point) => void;
  onPickupSelect?: (point: Point) => void;
  pickupLabel?: string;
  rideType?: string;
  selectedDropoff?: Point | null;
  selectedPickup?: Point | null;
}) {
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("pickup");
  const [pickup, setPickup] = useState<Point | null>(null);
  const [dropoff, setDropoff] = useState<Point | null>(null);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [trackingRouteSummary, setTrackingRouteSummary] = useState<RouteSummary | null>(null);
  const [routeStatus, setRouteStatus] = useState("");

  const isLiveTracking =
    Boolean(activeRide) &&
    ["accepted", "ongoing"].includes(activeRide?.status ?? "");
  const isActiveTripView = Boolean(activeRide);

  const activePickup =
    activeRide?.pickup_lat !== null &&
    activeRide?.pickup_lat !== undefined &&
    activeRide?.pickup_lng !== null &&
    activeRide?.pickup_lng !== undefined
      ? { lat: activeRide.pickup_lat, lng: activeRide.pickup_lng }
      : null;
  const activeDropoff =
    activeRide?.dropoff_lat !== null &&
    activeRide?.dropoff_lat !== undefined &&
    activeRide?.dropoff_lng !== null &&
    activeRide?.dropoff_lng !== undefined
      ? { lat: activeRide.dropoff_lat, lng: activeRide.dropoff_lng }
      : null;
  const driverLocation = useMemo(
    () =>
      activeRide?.driver_lat !== null &&
      activeRide?.driver_lat !== undefined &&
      activeRide?.driver_lng !== null &&
      activeRide?.driver_lng !== undefined
        ? { lat: activeRide.driver_lat, lng: activeRide.driver_lng }
        : null,
    [activeRide],
  );

  const displayPickup = isActiveTripView ? activePickup : pickup;
  const displayDropoff = isActiveTripView ? activeDropoff : dropoff;

  const trackingRoute = useMemo(() => {
    if (!isLiveTracking || !displayPickup) {
      return null;
    }

    return resolveDriverMapRoute({
      driverLocation,
      dropoff: displayDropoff ?? displayPickup,
      pickup: displayPickup,
      rideStatus: activeRide?.status,
    });
  }, [
    activeRide?.status,
    displayDropoff,
    displayPickup,
    driverLocation,
    isLiveTracking,
  ]);

  const viewportFitPoints = useMemo(() => {
    const points: Point[] = [];

    if (displayPickup) {
      points.push(displayPickup);
    }

    if (displayDropoff && (!isLiveTracking || trackingRoute?.showDropoff)) {
      points.push(displayDropoff);
    }

    return points;
  }, [displayDropoff, displayPickup, isLiveTracking, trackingRoute?.showDropoff]);

  const viewportFitKey = useMemo(() => {
    if (viewportFitPoints.length === 0) {
      return "";
    }

    const base = pointsFitKey(viewportFitPoints);
    return isLiveTracking ? `${base}|${activeRide?.status ?? ""}` : base;
  }, [activeRide?.status, isLiveTracking, viewportFitPoints]);

  const trackingRoutePath = trackingRoute
    ? trackingRouteSummary?.path ?? [trackingRoute.from, trackingRoute.to]
    : [];
  const bookingRoutePath = routeSummary?.path ?? [];

  const distanceKm =
    displayPickup && displayDropoff ? (routeSummary?.distanceKm ?? null) : null;
  const estimatedFare =
    distanceKm === null ? null : estimateFare(distanceKm, rideType);

  const pickupSummary = displayPickup
    ? formatLocationLabel(
        isActiveTripView ? (activeRide?.pickup_address ?? "") : pickupLabel,
        "Selected pickup on map",
      )
    : "Not set";
  const dropoffSummary = displayDropoff
    ? formatLocationLabel(
        isActiveTripView ? (activeRide?.dropoff_address ?? "") : dropoffLabel,
        "Selected drop-off on map",
      )
    : "Not set";

  useEffect(() => {
    if (isActiveTripView) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (selectedPickup) {
        setPickup(selectedPickup);
        setSelectionMode("dropoff");
        return;
      }

      setPickup(null);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [isActiveTripView, selectedPickup]);

  useEffect(() => {
    if (isActiveTripView) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (selectedDropoff) {
        setDropoff(selectedDropoff);
        return;
      }

      setDropoff(null);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [isActiveTripView, selectedDropoff]);

  function handleSelect(mode: SelectionMode, point: Point) {
    if (isActiveTripView) {
      return;
    }

    setRouteSummary(null);
    setRouteStatus("");

    if (mode === "pickup") {
      setPickup(point);
      setSelectionMode("dropoff");
      onPickupSelect?.(point);
      return;
    }

    setDropoff(point);
    onDropoffSelect?.(point);
  }

  const mapHeaderTitle = isLiveTracking
    ? "Live trip map"
    : isActiveTripView
      ? "Trip map"
      : "Map pickup";
  const mapHeaderDescription = isLiveTracking
    ? driverLocation
      ? activeRide?.status === "ongoing"
        ? "Your driver is heading to the drop-off."
        : "Your driver is heading to your pickup point."
      : "Waiting for your driver's live location..."
    : isActiveTripView
      ? "Your active ride pickup and drop-off pins."
      : `Click the map to set ${selectionMode === "pickup" ? "pickup" : "drop-off"}.`;

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500">{mapHeaderTitle}</p>
          <p className="text-xs text-slate-500">{mapHeaderDescription}</p>
        </div>

        {!isActiveTripView ? (
          <div className="flex gap-2">
            <button
              className={`rounded-xl px-3 py-2 text-xs font-black ${
                selectionMode === "pickup"
                  ? "bg-orange-500 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
              onClick={() => setSelectionMode("pickup")}
              type="button"
            >
              Pickup
            </button>
            <button
              className={`rounded-xl px-3 py-2 text-xs font-black ${
                selectionMode === "dropoff"
                  ? "bg-orange-500 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
              onClick={() => setSelectionMode("dropoff")}
              type="button"
            >
              Drop-off
            </button>
          </div>
        ) : null}
      </div>

      <div className="tw-map-shell overflow-hidden">
        <RideRequestLeafletMap
          bookingRoutePath={bookingRoutePath}
          dashedRoute={routeSummary?.source === "straight"}
          displayDropoff={displayDropoff}
          displayPickup={displayPickup}
          driverLocation={driverLocation}
          isActiveTripView={isActiveTripView}
          isLiveTracking={isLiveTracking}
          onBookingRoute={setRouteSummary}
          onMapClick={(point) => handleSelect(selectionMode, point)}
          onRouteStatus={setRouteStatus}
          onTrackingRoute={setTrackingRouteSummary}
          trackingRoute={trackingRoute}
          trackingRoutePath={trackingRoutePath}
          viewportFitKey={viewportFitKey}
          viewportFitPoints={viewportFitPoints}
        />
      </div>

      <div className="grid gap-3 rounded-3xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="font-bold text-slate-500">Pickup</p>
          <p className="mt-1 line-clamp-2 font-black">{pickupSummary}</p>
        </div>
        <div>
          <p className="font-bold text-slate-500">Drop-off</p>
          <p className="mt-1 line-clamp-2 font-black">{dropoffSummary}</p>
        </div>
        <div>
          <p className="font-bold text-slate-500">
            {isLiveTracking ? "Driver route" : "Estimate"}
          </p>
          <p className="mt-1 font-black">
            {isLiveTracking
              ? trackingRouteSummary
                ? `${trackingRouteSummary.distanceKm.toFixed(2)} km / ${trackingRouteSummary.durationMinutes} min`
                : driverLocation
                  ? activeRide?.status === "ongoing"
                    ? "Heading to drop-off"
                    : "Heading to pickup"
                  : "Locating driver..."
              : distanceKm !== null
                ? `${distanceKm.toFixed(2)} km / ${routeSummary?.durationMinutes ?? "--"} min / PHP ${estimatedFare}`
                : "Select both pins"}
          </p>
        </div>
      </div>

      {routeStatus && !isActiveTripView ? (
        <p className="rounded-2xl bg-orange-50 px-4 py-3 text-xs font-bold text-orange-800">
          {routeStatus}
        </p>
      ) : null}

      {!isActiveTripView ? (
        <>
          <input
            name="pickup_lat"
            type="hidden"
            value={selectedPickup?.lat ?? pickup?.lat ?? ""}
          />
          <input
            name="pickup_lng"
            type="hidden"
            value={selectedPickup?.lng ?? pickup?.lng ?? ""}
          />
          <input
            name="dropoff_lat"
            type="hidden"
            value={selectedDropoff?.lat ?? dropoff?.lat ?? ""}
          />
          <input
            name="dropoff_lng"
            type="hidden"
            value={selectedDropoff?.lng ?? dropoff?.lng ?? ""}
          />
        </>
      ) : null}
    </div>
  );
}

export type { Point } from "@/lib/mapTypes";
