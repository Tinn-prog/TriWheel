export type RideRatingVariant = "regular" | "emergency";

export type RideRatingAudience = "passenger" | "driver";

type RideRatingCopy = {
  title: string;
  description: string;
  formLabel: string;
  feedbackPlaceholder: string;
  submitLabel: string;
  summaryLabel: string;
};

const PASSENGER_REGULAR: RideRatingCopy = {
  title: "How was your ride?",
  description:
    "Share a quick rating to help other passengers choose reliable drivers.",
  formLabel: "Rate your driver",
  feedbackPlaceholder: "What stood out about this trip?",
  submitLabel: "Submit feedback",
  summaryLabel: "Regular ride rating",
};

const PASSENGER_EMERGENCY: RideRatingCopy = {
  title: "How was the emergency response?",
  description:
    "Rate how quickly and safely the driver handled your emergency request.",
  formLabel: "Rate emergency response",
  feedbackPlaceholder: "How was pickup speed, safety, and communication?",
  submitLabel: "Submit emergency feedback",
  summaryLabel: "Emergency response rating",
};

const DRIVER_REGULAR: RideRatingCopy = {
  title: "How was this passenger?",
  description: "Share feedback about this regular trip.",
  formLabel: "Rate passenger",
  feedbackPlaceholder: "How was pickup behavior and cooperation?",
  submitLabel: "Submit feedback",
  summaryLabel: "Regular ride rating",
};

const DRIVER_EMERGENCY: RideRatingCopy = {
  title: "How was this emergency trip?",
  description:
    "Share feedback about how this passenger handled the emergency pickup.",
  formLabel: "Rate emergency passenger",
  feedbackPlaceholder: "Was the pickup location clear and was cooperation good?",
  submitLabel: "Submit emergency feedback",
  summaryLabel: "Emergency trip rating",
};

export function getRideRatingCopy(
  variant: RideRatingVariant,
  audience: RideRatingAudience,
): RideRatingCopy {
  if (audience === "passenger") {
    return variant === "emergency" ? PASSENGER_EMERGENCY : PASSENGER_REGULAR;
  }

  return variant === "emergency" ? DRIVER_EMERGENCY : DRIVER_REGULAR;
}

export function rideRatingVariant(isEmergency?: boolean): RideRatingVariant {
  return isEmergency ? "emergency" : "regular";
}

export function pickDriverRatingStats(ride: {
  is_emergency?: boolean;
  driver_average_rating?: number | null;
  driver_rating_count?: number;
  driver_emergency_average_rating?: number | null;
  driver_emergency_rating_count?: number;
}) {
  if (ride.is_emergency) {
    return {
      average: ride.driver_emergency_average_rating ?? null,
      count: ride.driver_emergency_rating_count ?? 0,
      variant: "emergency" as const,
    };
  }

  return {
    average: ride.driver_average_rating ?? null,
    count: ride.driver_rating_count ?? 0,
    variant: "regular" as const,
  };
}
