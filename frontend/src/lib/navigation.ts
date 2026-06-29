import type { Point } from "./mapTypes";

export function buildNavigationUrl(destination: Point) {
  const url = new URL("https://www.openstreetmap.org/directions");
  url.searchParams.set("route", `${destination.lat},${destination.lng}`);
  return url.toString();
}

export function getDriverNavigationTarget(ride: {
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  status: string;
}): { label: string; point: Point } | null {
  if (
    ride.status === "accepted" &&
    ride.pickup_lat !== null &&
    ride.pickup_lng !== null
  ) {
    return {
      label: "Navigate to Pickup",
      point: { lat: ride.pickup_lat, lng: ride.pickup_lng },
    };
  }

  if (
    ride.status === "ongoing" &&
    ride.dropoff_lat !== null &&
    ride.dropoff_lng !== null
  ) {
    return {
      label: "Navigate to Drop-off",
      point: { lat: ride.dropoff_lat, lng: ride.dropoff_lng },
    };
  }

  return null;
}