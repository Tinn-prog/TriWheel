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
import { shouldDrawDriverRoute, type DriverMapRoute } from "@/lib/driverMapRoute";
import { defaultMapCenter, type Point, type RouteSummary } from "@/lib/mapTypes";

type DriverRoute = DriverMapRoute | null;

export function RideRequestLeafletMap({
  bookingRoutePath,
  dashedRoute,
  displayDropoff,
  displayPickup,
  driverLocation,
  isActiveTripView,
  isLiveTracking,
  onMapClick,
  onBookingRoute,
  onRouteStatus,
  onTrackingRoute,
  trackingRoute,
  trackingRoutePath,
  viewportFitKey,
  viewportFitPoints,
}: {
  bookingRoutePath: Point[];
  dashedRoute: boolean;
  displayDropoff: Point | null;
  displayPickup: Point | null;
  driverLocation: Point | null;
  isActiveTripView: boolean;
  isLiveTracking: boolean;
  onMapClick: (point: Point) => void;
  onBookingRoute: (summary: RouteSummary | null) => void;
  onRouteStatus: (message: string) => void;
  onTrackingRoute: (summary: RouteSummary | null) => void;
  trackingRoute: DriverRoute;
  trackingRoutePath: Point[];
  viewportFitKey: string;
  viewportFitPoints: Point[];
}) {
  return (
    <>
      {isLiveTracking && trackingRoute && shouldDrawDriverRoute(trackingRoute) ? (
        <ApiDirectionsLoader
          from={trackingRoute.from}
          onRoute={onTrackingRoute}
          to={trackingRoute.to}
        />
      ) : !isLiveTracking ? (
        <ApiDirectionsLoader
          from={displayPickup}
          onRoute={onBookingRoute}
          onStatus={onRouteStatus}
          to={displayDropoff}
        />
      ) : null}

      <LeafletMapSurface
        center={displayPickup ?? defaultMapCenter}
        className="h-80 w-full"
        clickable={!isActiveTripView}
        onClick={onMapClick}
      >
        <LeafletFitBounds fitKey={viewportFitKey} fitPoints={viewportFitPoints} />
        <LeafletRecenter
          center={displayPickup}
          enabled={!viewportFitKey && Boolean(displayPickup)}
        />
        {isLiveTracking ? (
          <LeafletRouteLine dashed={false} path={trackingRoutePath} />
        ) : (
          <LeafletRouteLine dashed={dashedRoute} path={bookingRoutePath} />
        )}
        {driverLocation ? <LeafletDriverMarker position={driverLocation} title="Driver" /> : null}
        {displayPickup ? <LeafletPickupMarker position={displayPickup} /> : null}
        {displayDropoff && (!isLiveTracking || trackingRoute?.showDropoff) ? (
          <LeafletDropoffMarker position={displayDropoff} />
        ) : null}
      </LeafletMapSurface>
    </>
  );
}
