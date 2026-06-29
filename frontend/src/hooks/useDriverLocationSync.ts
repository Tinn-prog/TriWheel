"use client";

import { apiRoutes } from "@/lib/api";
import type { Point } from "@/lib/mapTypes";
import { useEffect, useRef } from "react";

const DEFAULT_SEND_INTERVAL_MS = 8000;
const ACTIVE_RIDE_SEND_INTERVAL_MS = 3000;

type DriverLocationSyncOptions = {
  urgent?: boolean;
};

export function useDriverLocationSync(
  userId: number | undefined,
  enabled: boolean,
  options: DriverLocationSyncOptions = {},
) {
  const lastSentRef = useRef(0);
  const lastPointRef = useRef<Point | null>(null);
  const urgent = options.urgent ?? false;
  const minSendIntervalMs = urgent
    ? ACTIVE_RIDE_SEND_INTERVAL_MS
    : DEFAULT_SEND_INTERVAL_MS;

  useEffect(() => {
    if (!userId || !enabled || !navigator.geolocation) {
      return;
    }

    let cancelled = false;

    async function sendLocation(point: Point, force = false) {
      const now = Date.now();
      const lastPoint = lastPointRef.current;
      const moved =
        !lastPoint ||
        lastPoint.lat !== point.lat ||
        lastPoint.lng !== point.lng;

      if (
        !force &&
        !moved &&
        now - lastSentRef.current < minSendIntervalMs
      ) {
        return;
      }

      lastSentRef.current = now;
      lastPointRef.current = point;

      try {
        const response = await fetch(apiRoutes.driverLocation, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            lat: point.lat,
            lng: point.lng,
          }),
        });

        if (!response.ok && !cancelled) {
          lastSentRef.current = 0;
        }
      } catch {
        if (!cancelled) {
          lastSentRef.current = 0;
        }
      }
    }

    function handlePosition(position: GeolocationPosition, force = false) {
      void sendLocation(
        {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
        force,
      );
    }

    navigator.geolocation.getCurrentPosition(
      (position) => handlePosition(position, true),
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );

    const watchId = navigator.geolocation.watchPosition(
      (position) => handlePosition(position),
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );

    const pollId = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => handlePosition(position),
        () => undefined,
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
      );
    }, minSendIntervalMs);

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
      window.clearInterval(pollId);
    };
  }, [enabled, minSendIntervalMs, userId]);
}
