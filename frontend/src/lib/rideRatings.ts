const LEGACY_RATING_TO_STARS: Record<string, number> = {
  good: 5,
  satisfied: 4,
  neutral: 3,
  dissatisfied: 2,
  very_dissatisfied: 1,
};

export function parseRatingToStars(rating: string | number | null | undefined): number | null {
  if (rating === null || rating === undefined || rating === "") {
    return null;
  }

  if (typeof rating === "number" && rating >= 1 && rating <= 5) {
    return rating;
  }

  const normalized = String(rating).trim();

  if (/^[1-5]$/.test(normalized)) {
    return Number(normalized);
  }

  return LEGACY_RATING_TO_STARS[normalized] ?? null;
}
