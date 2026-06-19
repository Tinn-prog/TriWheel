"use client";

import { DivIcon, LatLngExpression } from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";

type Point = {
  lat: number;
  lng: number;
};

type OsrmRouteResponse = {
  code?: string;
  routes?: Array<{
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
  }>;
};

const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";
const tileLayerUrl = mapTilerKey
  ? `https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${mapTilerKey}`
  : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const tileAttribution = mapTilerKey
  ? '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function createMarkerIcon(label: string, color: string) {
  return new DivIcon({
    className: "",
    html: `<div style="
      width: 30px;
      height: 30px;
      border-radius: 9999px;
      display: grid;
      place-items: center;
      background: ${color};
      color: white;
      border: 3px solid white;
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.22);
      font: 800 11px system-ui, sans-serif;
    ">${label}</div>`,
    iconAnchor: [15, 15],
  });
}

function MapViewport({ dropoff, pickup }: { dropoff: Point; pickup: Point }) {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(
      [
        [pickup.lat, pickup.lng],
        [dropoff.lat, dropoff.lng],
      ],
      { padding: [34, 34] },
    );
  }, [dropoff, map, pickup]);

  return null;
}

export function DriverRouteMap({
  dropoff,
  pickup,
}: {
  dropoff: Point;
  pickup: Point;
}) {
  const [routeLine, setRouteLine] = useState<LatLngExpression[]>([
    [pickup.lat, pickup.lng],
    [dropoff.lat, dropoff.lng],
  ]);
  const pickupIcon = useMemo(() => createMarkerIcon("P", "#f97316"), []);
  const dropoffIcon = useMemo(() => createMarkerIcon("D", "#0f172a"), []);

  useEffect(() => {
    const abortController = new AbortController();
    const coordinates = `${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}`;

    async function loadRoute() {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
          { signal: abortController.signal },
        );

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as OsrmRouteResponse;
        const routeCoordinates = data.routes?.[0]?.geometry?.coordinates ?? [];

        if (data.code === "Ok" && routeCoordinates.length) {
          setRouteLine(routeCoordinates.map(([lng, lat]) => [lat, lng]));
        }
      } catch {
        setRouteLine([
          [pickup.lat, pickup.lng],
          [dropoff.lat, dropoff.lng],
        ]);
      }
    }

    void loadRoute();

    return () => abortController.abort();
  }, [dropoff, pickup]);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200">
      <MapContainer
        center={pickup}
        className="h-72 w-full"
        scrollWheelZoom={false}
        zoom={13}
      >
        <TileLayer attribution={tileAttribution} url={tileLayerUrl} />
        <MapViewport dropoff={dropoff} pickup={pickup} />
        <Polyline
          pathOptions={{ color: "#f97316", weight: 5 }}
          positions={routeLine}
        />
        <Marker icon={pickupIcon} position={pickup} />
        <Marker icon={dropoffIcon} position={dropoff} />
      </MapContainer>
    </div>
  );
}
