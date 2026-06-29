"use client";

import type { Point } from "@/lib/mapTypes";
import { useMap } from "react-leaflet";
import { useEffect, useRef } from "react";

export function LeafletFitBounds({
  fitKey,
  fitPoints,
  padding = 40,
  singlePointZoom = 14,
}: {
  fitKey: string;
  fitPoints: Point[];
  padding?: number;
  singlePointZoom?: number;
}) {
  const map = useMap();
  const lastFitKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!fitKey || fitPoints.length === 0) {
      return;
    }

    if (lastFitKeyRef.current === fitKey) {
      return;
    }

    lastFitKeyRef.current = fitKey;

    if (fitPoints.length === 1) {
      map.setView([fitPoints[0].lat, fitPoints[0].lng], singlePointZoom);
      return;
    }

    const bounds = fitPoints.map(
      (point) => [point.lat, point.lng] as [number, number],
    );
    map.fitBounds(bounds, { padding: [padding, padding] });
  }, [fitKey, fitPoints, map, padding, singlePointZoom]);

  return null;
}

export function LeafletRecenter({
  center,
  enabled = true,
  zoom = 14,
}: {
  center: Point | null;
  enabled?: boolean;
  zoom?: number;
}) {
  const map = useMap();
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !center) {
      return;
    }

    const key = `${center.lat.toFixed(4)},${center.lng.toFixed(4)}`;
    if (lastKeyRef.current === key) {
      return;
    }

    lastKeyRef.current = key;
    map.setView([center.lat, center.lng], zoom);
  }, [center, enabled, map, zoom]);

  return null;
}
