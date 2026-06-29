"use client";

import type { ReactNode } from "react";
import "leaflet/dist/leaflet.css";

import { defaultMapCenter, type Point } from "@/lib/mapTypes";
import { MapContainer, Marker, Polyline, TileLayer, useMapEvents } from "react-leaflet";
import { LeafletFitBounds, LeafletRecenter } from "./LeafletFitBounds";
import { leafletDriverIcon, leafletPinIcon } from "./leafletSetup";

function MapClickHandler({
  enabled,
  onClick,
}: {
  enabled: boolean;
  onClick: (point: Point) => void;
}) {
  useMapEvents({
    click(event) {
      if (!enabled) {
        return;
      }

      onClick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  return null;
}

export function LeafletMapSurface({
  center = defaultMapCenter,
  children,
  className = "h-80 w-full",
  clickable = false,
  onClick,
}: {
  center?: Point;
  children?: ReactNode;
  className?: string;
  clickable?: boolean;
  onClick?: (point: Point) => void;
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      className={className}
      scrollWheelZoom
      zoom={13}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {clickable && onClick ? (
        <MapClickHandler enabled onClick={onClick} />
      ) : null}
      {children}
    </MapContainer>
  );
}

export function LeafletPickupMarker({ position }: { position: Point }) {
  return (
    <Marker icon={leafletPinIcon("blue")} position={[position.lat, position.lng]} />
  );
}

export function LeafletDropoffMarker({ position }: { position: Point }) {
  return (
    <Marker icon={leafletPinIcon("red")} position={[position.lat, position.lng]} />
  );
}

export function LeafletRequestMarker({
  focused,
  position,
  title,
}: {
  focused?: boolean;
  position: Point;
  title?: string;
}) {
  return (
    <Marker
      icon={leafletPinIcon(focused ? "orange" : "green")}
      position={[position.lat, position.lng]}
      title={title}
    />
  );
}

export function LeafletDriverMarker({
  position,
  title,
}: {
  position: Point;
  title?: string;
}) {
  return (
    <Marker
      icon={leafletDriverIcon()}
      position={[position.lat, position.lng]}
      title={title}
    />
  );
}

export function LeafletRouteLine({
  dashed = false,
  path,
}: {
  dashed?: boolean;
  path: Point[];
}) {
  if (path.length < 2) {
    return null;
  }

  return (
    <Polyline
      pathOptions={{
        color: dashed ? "#94a3b8" : "#f97316",
        dashArray: dashed ? "8 8" : undefined,
        weight: 5,
      }}
      positions={path.map((point) => [point.lat, point.lng] as [number, number])}
    />
  );
}

export { LeafletFitBounds, LeafletRecenter };
