"use client";

import {
  LeafletDriverMarker,
  LeafletMapSurface,
} from "@/components/leaflet/LeafletMapSurface";
import type { Point } from "@/lib/mapTypes";

export function AdminLiveLeafletMap({
  center,
  drivers,
}: {
  center: Point;
  drivers: Array<{
    id: number;
    name: string | null;
    lat: number;
    lng: number;
    plate_number: string | null;
  }>;
}) {
  return (
    <LeafletMapSurface center={center} className="h-[32rem] w-full">
      {drivers.map((driver) => (
        <LeafletDriverMarker
          key={driver.id}
          position={{ lat: driver.lat, lng: driver.lng }}
          title={`${driver.name ?? "Driver"} • ${driver.plate_number ?? "Vehicle"}`}
        />
      ))}
    </LeafletMapSurface>
  );
}
