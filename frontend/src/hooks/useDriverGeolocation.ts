"use client";

import { useEffect, useState } from "react";
import type { Point } from "@/lib/mapTypes";

export function useDriverGeolocation(enabled = true) {
  const [driverLocation, setDriverLocation] = useState<Point | null>(null);
  const [locationMessage, setLocationMessage] = useState(
    enabled ? "Locating you on the map..." : "",
  );

  useEffect(() => {
    if (!enabled) {
      setDriverLocation(null);
      setLocationMessage("");
      return;
    }

    if (!navigator.geolocation) {
      setLocationMessage("Location access is not supported in this browser.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setDriverLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationMessage("");
      },
      () => {
        setLocationMessage("Allow location access to show your route to pickup.");
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  return { driverLocation, locationMessage };
}
