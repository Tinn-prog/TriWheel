export function formatRideTypeLabel(rideType?: string | null) {
  switch (rideType) {
    case "e-tricycle":
      return "E-tricycle";
    case "pedicab":
      return "Pedicab";
    case "tricycle":
      return "Tricycle";
    default:
      return rideType?.trim() || "Standard";
  }
}
