"use client";

import { ApiDirectionsLoader } from "@/components/leaflet/ApiDirectionsLoader";
import {
  LeafletDriverMarker,
  LeafletDropoffMarker,
  LeafletFitBounds,
  LeafletMapSurface,
  LeafletPickupMarker,
  LeafletRecenter,
  LeafletRouteLine,
} from "@/components/leaflet/LeafletMapSurface";
import { useDriverGeolocation } from "@/hooks/useDriverGeolocation";
import {
  resolveDriverMapRoute,
  shouldDrawDriverRoute,
} from "@/lib/driverMapRoute";
import { defaultMapCenter, type Point, type RouteSummary } from "@/lib/mapTypes";
import { pointsFitKey } from "@/lib/mapUtils";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

const DriverRouteLeafletMap = dynamic(
  () => Promise.resolve({ default: DriverRouteLeafletMapInner }),
  { ssr: false },
);

function DriverRouteLeafletMapInner({
  dropoff,
  pickup,
  rideStatus,
}: {
  dropoff: Point;
  pickup: Point;
  rideStatus?: string;
}) {
  const trackDriver =
    rideStatus === "accepted" || rideStatus === "ongoing";
  const { driverLocation } = useDriverGeolocation(trackDriver);
  const route = useMemo(
    () =>
      resolveDriverMapRoute({
        driverLocation,
        dropoff,
        pickup,
        rideStatus,
      }),
    [driverLocation, dropoff, pickup, rideStatus],
  );
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const routePath = routeSummary?.path ?? [route.from, route.to];
  const viewportPoints = useMemo(() => {
    const points = [pickup];

    if (route.showDropoff) {
      points.push(dropoff);
    }

    return points;
  }, [dropoff, pickup, route.showDropoff]);

  const viewportFitKey = useMemo(
    () => `${pointsFitKey(viewportPoints)}|${rideStatus ?? "preview"}`,
    [rideStatus, viewportPoints],
  );

  return (
    <>
      {shouldDrawDriverRoute(route) ? (
        <ApiDirectionsLoader
          from={route.from}
          onRoute={setRouteSummary}
          to={route.to}
        />
      ) : null}
      <LeafletMapSurface center={pickup ?? defaultMapCenter} className="h-72 w-full">
        <LeafletFitBounds fitKey={viewportFitKey} fitPoints={viewportPoints} />
        <LeafletRecenter
          center={driverLocation}
          enabled={!viewportFitKey && Boolean(driverLocation)}
        />
        {shouldDrawDriverRoute(route) ? <LeafletRouteLine path={routePath} /> : null}
        {route.showDriver && driverLocation ? (
          <LeafletDriverMarker position={driverLocation} title="You" />
        ) : null}
        <LeafletPickupMarker position={pickup} />
        {route.showDropoff ? <LeafletDropoffMarker position={dropoff} /> : null}
      </LeafletMapSurface>
      {route.mode === "to-pickup" && !driverLocation ? (
        <p className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
          Allow location access to draw the route from you to pickup.
        </p>
      ) : null}
    </>
  );
}

export function DriverRouteMap({
  dropoff,
  pickup,
  rideStatus,
}: {
  dropoff: Point;
  pickup: Point;
  rideStatus?: string;
}) {
  return (
    <div className="tw-map-shell overflow-hidden">
      <DriverRouteLeafletMap dropoff={dropoff} pickup={pickup} rideStatus={rideStatus} />
    </div>
  );
}
