const DISMISSED_RATINGS_KEY = "triwheel_dismissed_rating_rides";

export function readDismissedRatingRideIds(): number[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = sessionStorage.getItem(DISMISSED_RATINGS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];

    return Array.isArray(parsed)
      ? parsed.filter((value): value is number => typeof value === "number")
      : [];
  } catch {
    return [];
  }
}

export function dismissRatingRide(rideId: number) {
  const ids = readDismissedRatingRideIds();

  if (ids.includes(rideId)) {
    return;
  }

  sessionStorage.setItem(
    DISMISSED_RATINGS_KEY,
    JSON.stringify([...ids, rideId]),
  );
}

export function clearDismissedRatingRide(rideId: number) {
  const ids = readDismissedRatingRideIds().filter((id) => id !== rideId);

  sessionStorage.setItem(DISMISSED_RATINGS_KEY, JSON.stringify(ids));
}
