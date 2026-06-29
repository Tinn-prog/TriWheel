export type Point = {
  lat: number;
  lng: number;
};

export const defaultMapCenter: Point = {
  lat: 14.5995,
  lng: 120.9842,
};

export type PlaceSuggestion = {
  display_name: string;
  lat?: string;
  lon?: string;
  place_id: string;
  secondary_text?: string;
};

export type RouteSummary = {
  distanceKm: number;
  durationMinutes: number;
  path: Point[];
  source: "road" | "straight";
};

export function calculateDistanceKm(from: Point, to: Point) {
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

export function fareRuleForRideType(rideType: string) {
  if (rideType === "pedicab") {
    return { baseFare: 25, succeedingKmRate: 10 };
  }

  if (rideType === "e-tricycle") {
    return { baseFare: 40, succeedingKmRate: 16 };
  }

  return { baseFare: 35, succeedingKmRate: 14 };
}

export function estimateFare(distanceKm: number, rideType: string) {
  const { baseFare, succeedingKmRate } = fareRuleForRideType(rideType);
  const billableSucceedingKm = Math.max(0, Math.ceil(distanceKm - 1));

  return baseFare + billableSucceedingKm * succeedingKmRate;
}
