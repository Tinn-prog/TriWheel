"use client";

import { DivIcon, LatLngExpression } from "leaflet";
import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

export type Point = {
  lat: number;
  lng: number;
};

type SelectionMode = "pickup" | "dropoff";

const defaultCenter: LatLngExpression = [14.5995, 120.9842];
const openRouteServiceApiKey =
  process.env.NEXT_PUBLIC_OPENROUTESERVICE_API_KEY ?? "";
const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";
const tileLayerUrl = mapTilerKey
  ? `https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${mapTilerKey}`
  : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const tileAttribution = mapTilerKey
  ? '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

type RouteSummary = {
  distanceKm: number;
  durationMinutes: number;
  source: "road" | "straight";
};

type OpenRouteServiceResponse = {
  features?: Array<{
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
    properties?: {
      summary?: {
        distance?: number;
        duration?: number;
      };
    };
  }>;
};

type OsrmRouteResponse = {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
  }>;
};

function createMarkerIcon(label: string, color: string) {
  return new DivIcon({
    className: "",
    html: `<div style="
      width: 34px;
      height: 34px;
      border-radius: 9999px;
      display: grid;
      place-items: center;
      background: ${color};
      color: white;
      border: 3px solid white;
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.25);
      font: 800 12px system-ui, sans-serif;
    ">${label}</div>`,
    iconAnchor: [17, 17],
  });
}

function calculateDistanceKm(from: Point, to: Point) {
  const earthRadiusKm = 6371;
  const latDistance = ((to.lat - from.lat) * Math.PI) / 180;
  const lngDistance = ((to.lng - from.lng) * Math.PI) / 180;
  const fromLat = (from.lat * Math.PI) / 180;
  const toLat = (to.lat * Math.PI) / 180;

  const a =
    Math.sin(latDistance / 2) * Math.sin(latDistance / 2) +
    Math.cos(fromLat) *
      Math.cos(toLat) *
      Math.sin(lngDistance / 2) *
      Math.sin(lngDistance / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fareRuleForRideType(rideType: string) {
  if (rideType === "pedicab") {
    return { baseFare: 25, succeedingKmRate: 10 };
  }

  if (rideType === "e-tricycle") {
    return { baseFare: 40, succeedingKmRate: 16 };
  }

  return { baseFare: 35, succeedingKmRate: 14 };
}

function estimateFare(distanceKm: number, rideType: string) {
  const { baseFare, succeedingKmRate } = fareRuleForRideType(rideType);
  const billableSucceedingKm = Math.max(0, Math.ceil(distanceKm - 1));

  return baseFare + billableSucceedingKm * succeedingKmRate;
}

function MapClickHandler({
  mode,
  onSelect,
}: {
  mode: SelectionMode;
  onSelect: (mode: SelectionMode, point: Point) => void;
}) {
  useMapEvents({
    click(event) {
      onSelect(mode, {
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  return null;
}

function MapViewport({
  dropoff,
  pickup,
}: {
  dropoff: Point | null;
  pickup: Point | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (pickup && dropoff) {
      map.fitBounds(
        [
          [pickup.lat, pickup.lng],
          [dropoff.lat, dropoff.lng],
        ],
        { padding: [40, 40] },
      );
      return;
    }

    if (pickup || dropoff) {
      const point = pickup ?? dropoff;

      if (point) {
        map.setView([point.lat, point.lng], 15);
      }
    }
  }, [dropoff, map, pickup]);

  return null;
}

export function RideRequestMap({
  dropoffLabel = "",
  pickupLabel = "",
  rideType = "tricycle",
  selectedDropoff,
  selectedPickup,
}: {
  dropoffLabel?: string;
  pickupLabel?: string;
  rideType?: string;
  selectedDropoff?: Point | null;
  selectedPickup?: Point | null;
}) {
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("pickup");
  const [pickup, setPickup] = useState<Point | null>(null);
  const [dropoff, setDropoff] = useState<Point | null>(null);
  const [routeLine, setRouteLine] = useState<LatLngExpression[]>([]);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [routeStatus, setRouteStatus] = useState("");

  const pickupIcon = useMemo(() => createMarkerIcon("P", "#f97316"), []);
  const dropoffIcon = useMemo(() => createMarkerIcon("D", "#0f172a"), []);
  const straightDistanceKm =
    pickup && dropoff ? calculateDistanceKm(pickup, dropoff) : null;
  const distanceKm = routeSummary?.distanceKm ?? straightDistanceKm;
  const estimatedFare =
    distanceKm === null ? null : estimateFare(distanceKm, rideType);
  const pickupSummary = pickup
    ? pickupLabel || "Selected pickup on map"
    : "Not set";
  const dropoffSummary = dropoff
    ? dropoffLabel || "Selected drop-off on map"
    : "Not set";

  useEffect(() => {
    if (selectedPickup) {
      const timeout = window.setTimeout(() => {
        setPickup(selectedPickup);
        setSelectionMode("dropoff");
      }, 0);

      return () => window.clearTimeout(timeout);
    }
  }, [selectedPickup]);

  useEffect(() => {
    if (selectedDropoff) {
      const timeout = window.setTimeout(() => {
        setDropoff(selectedDropoff);
      }, 0);

      return () => window.clearTimeout(timeout);
    }
  }, [selectedDropoff]);

  useEffect(() => {
    if (!pickup || !dropoff) {
      return;
    }

    const routePickup = pickup;
    const routeDropoff = dropoff;
    const straightDistance = calculateDistanceKm(routePickup, routeDropoff);

    const abortController = new AbortController();

    function applyStraightLineFallback(statusMessage: string) {
      setRouteLine([
        [routePickup.lat, routePickup.lng],
        [routeDropoff.lat, routeDropoff.lng],
      ]);
      setRouteSummary({
        distanceKm: straightDistance,
        durationMinutes: Math.max(1, Math.round((straightDistance / 20) * 60)),
        source: "straight",
      });
      setRouteStatus(statusMessage);
    }

    async function loadOsrmRoute() {
      const coordinates = `${routePickup.lng},${routePickup.lat};${routeDropoff.lng},${routeDropoff.lat}`;
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
        {
          signal: abortController.signal,
        },
      );

      if (!response.ok) {
        throw new Error("Road routing request failed.");
      }

      const data = (await response.json()) as OsrmRouteResponse;
      const route = data.routes?.[0];
      const routeCoordinates = route?.geometry?.coordinates ?? [];

      if (
        data.code !== "Ok" ||
        !routeCoordinates.length ||
        !route?.distance ||
        !route.duration
      ) {
        throw new Error("Road routing returned an incomplete route.");
      }

      setRouteLine(routeCoordinates.map(([lng, lat]) => [lat, lng]));
      setRouteSummary({
        distanceKm: route.distance / 1000,
        durationMinutes: Math.max(1, Math.round(route.duration / 60)),
        source: "road",
      });
      setRouteStatus("Using road navigation route.");
    }

    async function loadRoute() {
      if (!openRouteServiceApiKey) {
        setRouteStatus("Calculating road navigation route...");

        try {
          await loadOsrmRoute();
        } catch (caughtError) {
          if (abortController.signal.aborted) {
            return;
          }

          applyStraightLineFallback(
            caughtError instanceof Error
              ? `${caughtError.message} Using straight-line fallback.`
              : "Using straight-line fallback.",
          );
        }
        return;
      }

      setRouteStatus("Calculating road route...");

      try {
        const response = await fetch(
          "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              Authorization: openRouteServiceApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              coordinates: [
                [routePickup.lng, routePickup.lat],
                [routeDropoff.lng, routeDropoff.lat],
              ],
            }),
            signal: abortController.signal,
          },
        );

        if (!response.ok) {
          throw new Error("OpenRouteService route request failed.");
        }

        const data = (await response.json()) as OpenRouteServiceResponse;
        const route = data.features?.[0];
        const coordinates = route?.geometry?.coordinates ?? [];
        const summary = route?.properties?.summary;

        if (!coordinates.length || !summary?.distance || !summary.duration) {
          throw new Error("OpenRouteService returned an incomplete route.");
        }

        setRouteLine(coordinates.map(([lng, lat]) => [lat, lng]));
        setRouteSummary({
          distanceKm: summary.distance / 1000,
          durationMinutes: Math.max(1, Math.round(summary.duration / 60)),
          source: "road",
        });
        setRouteStatus("Using road route estimate.");
      } catch (caughtError) {
        if (abortController.signal.aborted) {
          return;
        }

        try {
          await loadOsrmRoute();
        } catch {
          if (abortController.signal.aborted) {
            return;
          }

          applyStraightLineFallback(
            caughtError instanceof Error
              ? `${caughtError.message} Road fallback also failed. Using straight-line fallback.`
              : "Road fallback failed. Using straight-line fallback.",
          );
        }
      }
    }

    void loadRoute();

    return () => abortController.abort();
  }, [dropoff, pickup]);

  function handleSelect(mode: SelectionMode, point: Point) {
    if (mode === "pickup") {
      setPickup(point);
      setSelectionMode("dropoff");
      return;
    }

    setDropoff(point);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500">Map pickup</p>
          <p className="text-xs text-slate-500">
            Click the map to set {selectionMode === "pickup" ? "pickup" : "drop-off"}.
          </p>
        </div>

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
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200">
        <MapContainer
          center={pickup ?? defaultCenter}
          className="h-80 w-full"
          scrollWheelZoom
          zoom={13}
        >
          <TileLayer
            attribution={tileAttribution}
            url={tileLayerUrl}
          />
          <MapViewport dropoff={dropoff} pickup={pickup} />
          <MapClickHandler mode={selectionMode} onSelect={handleSelect} />
          {routeLine.length > 0 && (
            <Polyline
              pathOptions={{
                color: routeSummary?.source === "road" ? "#f97316" : "#94a3b8",
                dashArray: routeSummary?.source === "road" ? undefined : "8",
                weight: 5,
              }}
              positions={routeLine}
            />
          )}
          {pickup && <Marker icon={pickupIcon} position={pickup} />}
          {dropoff && <Marker icon={dropoffIcon} position={dropoff} />}
        </MapContainer>
      </div>

      <div className="grid gap-3 rounded-3xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="font-bold text-slate-500">Pickup</p>
          <p className="mt-1 line-clamp-2 font-black">
            {pickupSummary}
          </p>
        </div>
        <div>
          <p className="font-bold text-slate-500">Drop-off</p>
          <p className="mt-1 line-clamp-2 font-black">
            {dropoffSummary}
          </p>
        </div>
        <div>
          <p className="font-bold text-slate-500">Estimate</p>
          <p className="mt-1 font-black">
            {distanceKm
              ? `${distanceKm.toFixed(2)} km / ${routeSummary?.durationMinutes ?? "--"} min / PHP ${estimatedFare}`
              : "Select both pins"}
          </p>
        </div>
      </div>

      {routeStatus && (
        <p className="rounded-2xl bg-orange-50 px-4 py-3 text-xs font-bold text-orange-800">
          {routeStatus}
        </p>
      )}

      <input name="pickup_lat" type="hidden" value={pickup?.lat ?? ""} />
      <input name="pickup_lng" type="hidden" value={pickup?.lng ?? ""} />
      <input name="dropoff_lat" type="hidden" value={dropoff?.lat ?? ""} />
      <input name="dropoff_lng" type="hidden" value={dropoff?.lng ?? ""} />
    </div>
  );
}
