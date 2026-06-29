"use client";

import { ApiDirectionsLoader } from "@/components/leaflet/ApiDirectionsLoader";
import {
  LeafletDriverMarker,
  LeafletDropoffMarker,
  LeafletFitBounds,
  LeafletMapSurface,
  LeafletPickupMarker,
  LeafletRecenter,
  LeafletRequestMarker,
  LeafletRouteLine,
} from "@/components/leaflet/LeafletMapSurface";
import { shouldDrawDriverRoute, type DriverMapRoute } from "@/lib/driverMapRoute";
import { type Point, type RouteSummary } from "@/lib/mapTypes";

type ActiveRoute = DriverMapRoute | null;

export function DriverDashboardLeafletMap({
  activeDropoff,
  activePickup,
  activeRoute,
  driverLocation,
  focusedDropoff,
  focusedRequestId,
  mapCenter,
  onRoute,
  requestPickups,
  routePath,
  viewportFitKey,
  viewportPoints,
}: {
  activeDropoff: Point | null;
  activePickup: Point | null;
  activeRoute: ActiveRoute;
  driverLocation: Point | null;
  focusedDropoff: Point | null;
  focusedRequestId: number | null;
  mapCenter: Point;
  onRoute: (summary: RouteSummary | null) => void;
  requestPickups: Array<{ id: number; point: Point }>;
  routePath: Point[];
  viewportFitKey: string;
  viewportPoints: Point[];
}) {
  return (
    <>
      {activeRoute && shouldDrawDriverRoute(activeRoute) ? (
        <ApiDirectionsLoader
          from={activeRoute.from}
          onRoute={onRoute}
          to={activeRoute.to}
        />
      ) : null}

      <LeafletMapSurface center={mapCenter} className="h-52 w-full sm:h-64 lg:h-72">
        <LeafletFitBounds fitKey={viewportFitKey} fitPoints={viewportPoints} padding={48} />
        <LeafletRecenter
          center={driverLocation}
          enabled={!viewportFitKey && Boolean(driverLocation)}
        />
        {activeRoute && shouldDrawDriverRoute(activeRoute) ? (
          <LeafletRouteLine path={routePath} />
        ) : null}
        {activePickup ? <LeafletPickupMarker position={activePickup} /> : null}
        {activeRoute?.showDropoff && activeDropoff ? (
          <LeafletDropoffMarker position={activeDropoff} />
        ) : null}
        {requestPickups.map((entry) => (
          <LeafletRequestMarker
            focused={focusedRequestId === entry.id}
            key={entry.id}
            position={entry.point}
            title={`Ride request #${entry.id}`}
          />
        ))}
        {focusedDropoff && !activeRoute?.showDropoff ? (
          <LeafletDropoffMarker position={focusedDropoff} />
        ) : null}
        {driverLocation ? <LeafletDriverMarker position={driverLocation} title="You" /> : null}
      </LeafletMapSurface>
    </>
  );
}
