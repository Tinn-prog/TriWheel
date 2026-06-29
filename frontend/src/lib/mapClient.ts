import type { PlaceSuggestion, Point, RouteSummary } from "./mapTypes";
import { calculateDistanceKm } from "./mapTypes";

export async function searchPlaces(query: string, signal?: AbortSignal) {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return [];
  }

  const response = await fetch(
    `/api/directions?mode=search&q=${encodeURIComponent(normalizedQuery)}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error("Unable to search places right now.");
  }

  const data = (await response.json()) as {
    results?: PlaceSuggestion[];
    message?: string;
  };

  if (!data.results) {
    throw new Error(data.message ?? "Unable to search places right now.");
  }

  return data.results;
}

export async function reverseGeocode(point: Point, signal?: AbortSignal) {
  const response = await fetch(
    `/api/directions?mode=reverse&lat=${point.lat}&lng=${point.lng}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error("Unable to look up address for this map pin.");
  }

  const data = (await response.json()) as {
    address?: string;
    message?: string;
  };

  return data.address ?? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}

export async function fetchDirections(
  from: Point,
  to: Point,
  signal?: AbortSignal,
): Promise<RouteSummary> {
  const straightDistance = calculateDistanceKm(from, to);

  try {
    const response = await fetch(
      `/api/directions?originLat=${from.lat}&originLng=${from.lng}&destinationLat=${to.lat}&destinationLng=${to.lng}`,
      { signal },
    );

    if (!response.ok) {
      throw new Error("Directions request failed.");
    }

    const data = (await response.json()) as RouteSummary & { message?: string };

    if (!data.path?.length) {
      throw new Error(data.message ?? "Directions returned an incomplete route.");
    }

    return data;
  } catch {
    return {
      distanceKm: straightDistance,
      durationMinutes: Math.max(1, Math.round((straightDistance / 20) * 60)),
      path: [from, to],
      source: "straight",
    };
  }
}
