import type { Point } from "./mapTypes";

export type DriverMapRouteMode = "preview" | "to-pickup" | "to-dropoff";

export type DriverMapRoute = {
  from: Point;
  mode: DriverMapRouteMode;
  showDriver: boolean;
  showDropoff: boolean;
  to: Point;
};

export function resolveDriverMapRoute({
  driverLocation,
  dropoff,
  pickup,
  rideStatus,
}: {
  driverLocation: Point | null;
  dropoff: Point;
  pickup: Point;
  rideStatus?: string;
}): DriverMapRoute {
  if (rideStatus === "accepted") {
    return {
      from: driverLocation ?? pickup,
      mode: "to-pickup",
      showDriver: Boolean(driverLocation),
      showDropoff: false,
      to: pickup,
    };
  }

  if (rideStatus === "ongoing") {
    return {
      from: driverLocation ?? pickup,
      mode: "to-dropoff",
      showDriver: Boolean(driverLocation),
      showDropoff: true,
      to: dropoff,
    };
  }

  return {
    from: pickup,
    mode: "preview",
    showDriver: false,
    showDropoff: true,
    to: dropoff,
  };
}

export function shouldDrawDriverRoute(route: DriverMapRoute) {
  return (
    route.from.lat !== route.to.lat ||
    route.from.lng !== route.to.lng
  );
}
