function resolveApiUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === "development") {
    return "/triwheel-api";
  }

  // Production builds must set NEXT_PUBLIC_API_URL (see frontend/vercel.json).
  console.error("NEXT_PUBLIC_API_URL is missing; API calls will fail in production.");
  return "http://localhost:8000/api";
}

export const API_URL = resolveApiUrl();

export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  const filesMarker = "/api/files/";
  const markerIndex = url.indexOf(filesMarker);

  if (markerIndex >= 0) {
    const filePath = url.slice(markerIndex + filesMarker.length);
    return `${API_URL}/files/${filePath}`;
  }

  return url;
}

export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  headers.set("ngrok-skip-browser-warning", "true");

  return fetch(input, {
    ...init,
    headers,
  });
}

export function toApiUrl(
  path: string,
  params?: Record<string, string | boolean | undefined>,
): string {
  const url = path.startsWith("http")
    ? new URL(path)
    : new URL(
        path,
        typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost:3000",
      );

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

export const apiRoutes = {
  health: `${API_URL}/health`,
  platformConfig: `${API_URL}/platform/config`,
  login: `${API_URL}/login`,
  logout: `${API_URL}/logout`,
  forgotPassword: `${API_URL}/forgot-password`,
  resetPassword: `${API_URL}/reset-password`,
  accountProfile: `${API_URL}/account/profile`,
  accountPassword: `${API_URL}/account/password`,
  adminDrivers: `${API_URL}/admin/drivers`,
  adminDriversApproved: `${API_URL}/admin/drivers/approved`,
  adminDriverLocations: `${API_URL}/admin/drivers/locations`,
  adminOverview: `${API_URL}/admin/overview`,
  adminDriverApproval: (driverId: number) =>
    `${API_URL}/admin/drivers/${driverId}/approval`,
  adminDriverDetails: (driverId: number) =>
    `${API_URL}/admin/drivers/${driverId}/details`,
  adminDriverAccount: (driverId: number) =>
    `${API_URL}/admin/drivers/${driverId}/account`,
  adminPassengers: `${API_URL}/admin/passengers`,
  adminPassengerVerification: (userId: number) =>
    `${API_URL}/admin/passengers/${userId}/verification`,
  adminPassengerDetails: (userId: number) => `${API_URL}/admin/passengers/${userId}`,
  adminPassengerAccount: (userId: number) =>
    `${API_URL}/admin/passengers/${userId}/account`,
  adminRides: `${API_URL}/admin/rides`,
  adminRide: (rideId: number) => `${API_URL}/admin/rides/${rideId}`,
  adminRideCancel: (rideId: number) => `${API_URL}/admin/rides/${rideId}/cancel`,
  adminRideReassign: (rideId: number) => `${API_URL}/admin/rides/${rideId}/reassign`,
  adminUsers: `${API_URL}/admin/users`,
  adminUser: (userId: number) => `${API_URL}/admin/users/${userId}`,
  adminUserSuspend: (userId: number) => `${API_URL}/admin/users/${userId}/suspend`,
  adminSettings: `${API_URL}/admin/settings`,
  adminDriverCompliance: (driverId: number) =>
    `${API_URL}/admin/drivers/${driverId}/compliance`,
  adminAuditLogs: `${API_URL}/admin/audit-logs`,
  adminReports: `${API_URL}/admin/reports`,
  adminReport: (reportId: number) => `${API_URL}/admin/reports/${reportId}`,
  adminRatings: `${API_URL}/admin/ratings`,
  adminExportUsers: `${API_URL}/admin/export/users`,
  adminExportDrivers: `${API_URL}/admin/export/drivers`,
  adminExportRides: `${API_URL}/admin/export/rides`,
  driverOverview: `${API_URL}/driver/overview`,
  driverAutoAccept: `${API_URL}/driver/auto-accept`,
  driverRegister: `${API_URL}/driver/register`,
  driverSuspensionAppeal: `${API_URL}/driver/suspension-appeal`,
  driverStatus: `${API_URL}/driver/status`,
  driverVehicle: `${API_URL}/driver/vehicle`,
  driverLocation: `${API_URL}/driver/location`,
  driverRideHistory: `${API_URL}/driver/rides/history`,
  driverRideOffer: (rideId: number) => `${API_URL}/driver/rides/${rideId}/offer`,
  driverRideCancel: (rideId: number) => `${API_URL}/driver/rides/${rideId}/cancel`,
  driverRideComplete: (rideId: number) => `${API_URL}/driver/rides/${rideId}/complete`,
  driverRideRating: (rideId: number) => `${API_URL}/driver/rides/${rideId}/rating`,
  driverRideStart: (rideId: number) => `${API_URL}/driver/rides/${rideId}/start`,
  passengerOverview: `${API_URL}/passenger/overview`,
  passengerRegister: `${API_URL}/passenger/register`,
  passengerRides: `${API_URL}/passenger/rides`,
  passengerEmergencyRide: `${API_URL}/passenger/rides/emergency`,
  passengerRideHistory: `${API_URL}/passenger/rides/history`,
  passengerRideRating: (rideId: number) =>
    `${API_URL}/passenger/rides/${rideId}/rating`,
  passengerRideOfferChoose: (offerId: number) =>
    `${API_URL}/passenger/ride-offers/${offerId}/choose`,
  rideComplianceCheck: `${API_URL}/rides/compliance-check`,
  serviceZones: `${API_URL}/service-zones`,
  rideCancel: (rideId: number) => `${API_URL}/rides/${rideId}/cancel`,
  rideReport: (rideId: number) => `${API_URL}/rides/${rideId}/report`,
  rideStatus: (rideId: number) => `${API_URL}/rides/${rideId}/status`,
  rideMessages: (rideId: number) => `${API_URL}/rides/${rideId}/messages`,
  notifications: `${API_URL}/notifications`,
  notificationsUnreadCount: `${API_URL}/notifications/unread-count`,
  notificationMarkRead: (notificationId: number) =>
    `${API_URL}/notifications/${notificationId}/read`,
  notificationsMarkAllRead: `${API_URL}/notifications/read-all`,
};
