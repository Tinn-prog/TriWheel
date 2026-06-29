"use client";

import { useDriverGeolocation } from "@/hooks/useDriverGeolocation";
import {
  resolveDriverMapRoute,
} from "@/lib/driverMapRoute";
import { defaultMapCenter, type Point, type RouteSummary } from "@/lib/mapTypes";
import { pointsFitKey } from "@/lib/mapUtils";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { DriverRide } from "./driverTypes";

const DriverDashboardLeafletMap = dynamic(
  () =>
    import("@/components/leaflet/DriverDashboardLeafletMap").then(
      (module) => module.DriverDashboardLeafletMap,
    ),
  {
    loading: () => (
      <div className="tw-map-shell grid h-52 place-items-center bg-slate-100 text-sm font-semibold text-slate-500 sm:h-64 lg:h-72">
        Loading map...
      </div>
    ),
    ssr: false,
  },
);

function ridePickup(ride: DriverRide): Point | null {
  if (ride.pickup_lat === null || ride.pickup_lng === null) {
    return null;
  }

  return { lat: ride.pickup_lat, lng: ride.pickup_lng };
}

function rideDropoff(ride: DriverRide): Point | null {
  if (ride.dropoff_lat === null || ride.dropoff_lng === null) {
    return null;
  }

  return { lat: ride.dropoff_lat, lng: ride.dropoff_lng };
}

function mapCaption({
  activeRide,
  requestCount,
  routeMode,
}: {
  activeRide: DriverRide | null;
  requestCount: number;
  routeMode?: string;
}) {
  if (activeRide?.status === "accepted") {
    return "Route from your location to the passenger pickup point.";
  }

  if (activeRide?.status === "ongoing") {
    return "Route from your location to the drop-off point.";
  }

  if (activeRide) {
    return "Active trip on the map.";
  }

  if (requestCount > 0) {
    return `${requestCount} open request${requestCount === 1 ? "" : "s"} on the map. Tap a request to highlight its pickup.`;
  }

  if (routeMode) {
    return "Your live location on the map.";
  }

  return "Your live location. Nearby ride requests will appear here when available.";
}

export function DriverDashboardMap({
  activeRide,
  availableRequests,
  focusedRequestId = null,
}: {
  activeRide: DriverRide | null;
  availableRequests: DriverRide[];
  focusedRequestId?: number | null;
}) {
  const { driverLocation, locationMessage } = useDriverGeolocation(true);
  const activePickup = activeRide ? ridePickup(activeRide) : null;
  const activeDropoff = activeRide ? rideDropoff(activeRide) : null;
  const requestPickups = useMemo(
    () =>
      availableRequests
        .map((ride) => ({ id: ride.id, point: ridePickup(ride) }))
        .filter((entry): entry is { id: number; point: Point } => entry.point !== null),
    [availableRequests],
  );

  const activeRoute =
    activePickup && activeDropoff
      ? resolveDriverMapRoute({
          driverLocation,
          dropoff: activeDropoff,
          pickup: activePickup,
          rideStatus: activeRide?.status,
        })
      : null;

  const mapCenter =
    driverLocation ?? activePickup ?? requestPickups[0]?.point ?? defaultMapCenter;

  const focusedRequest = useMemo(
    () =>
      focusedRequestId === null
        ? null
        : availableRequests.find((ride) => ride.id === focusedRequestId) ?? null,
    [availableRequests, focusedRequestId],
  );
  const focusedDropoff = focusedRequest ? rideDropoff(focusedRequest) : null;

  const viewportPoints = useMemo(() => {
    const points: Point[] = [];

    if (focusedRequest && focusedRequestId) {
      const focusedPickup = ridePickup(focusedRequest);
      if (focusedPickup) {
        points.push(focusedPickup);
      }
    }

    if (focusedDropoff) {
      points.push(focusedDropoff);
    }

    if (activePickup) {
      points.push(activePickup);
    }

    if (activeRoute?.showDropoff && activeDropoff) {
      points.push(activeDropoff);
    }

    if (!focusedRequestId) {
      requestPickups.forEach((entry) => points.push(entry.point));
    }

    return points;
  }, [
    activeDropoff,
    activePickup,
    activeRoute?.showDropoff,
    focusedDropoff,
    focusedRequest,
    focusedRequestId,
    requestPickups,
  ]);

  const viewportFitKey = useMemo(() => {
    if (viewportPoints.length === 0) {
      return "";
    }

    const requestIds = focusedRequestId
      ? String(focusedRequestId)
      : requestPickups.map((entry) => entry.id).join(",");
    return `${pointsFitKey(viewportPoints)}|${activeRide?.status ?? "idle"}|${requestIds}`;
  }, [activeRide?.status, focusedRequestId, requestPickups, viewportPoints]);

  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const routePath = activeRoute
    ? routeSummary?.path ?? [activeRoute.from, activeRoute.to]
    : [];

  return (
    <div className="grid gap-2">
      <div className="tw-map-shell overflow-hidden">
        <DriverDashboardLeafletMap
          activeDropoff={activeDropoff}
          activePickup={activePickup}
          activeRoute={activeRoute}
          driverLocation={driverLocation}
          focusedDropoff={focusedDropoff}
          focusedRequestId={focusedRequestId}
          mapCenter={mapCenter}
          onRoute={setRouteSummary}
          requestPickups={requestPickups}
          routePath={routePath}
          viewportFitKey={viewportFitKey}
          viewportPoints={viewportPoints}
        />
      </div>
      <p className="text-xs font-semibold text-slate-500">
        {locationMessage ||
          mapCaption({
            activeRide,
            requestCount: requestPickups.length,
            routeMode: activeRoute?.mode,
          })}
      </p>
    </div>
  );
}
