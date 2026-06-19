export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:8000/api";

export const apiRoutes = {
  health: `${API_URL}/health`,
  login: `${API_URL}/login`,
  adminDrivers: `${API_URL}/admin/drivers`,
  adminDriverApproval: (driverId: number) =>
    `${API_URL}/admin/drivers/${driverId}/approval`,
  adminPassengers: `${API_URL}/admin/passengers`,
  adminPassengerVerification: (userId: number) =>
    `${API_URL}/admin/passengers/${userId}/verification`,
  adminRides: `${API_URL}/admin/rides`,
  adminUsers: `${API_URL}/admin/users`,
  driverOverview: `${API_URL}/driver/overview`,
  driverRegister: `${API_URL}/driver/register`,
  driverStatus: `${API_URL}/driver/status`,
  driverRideHistory: `${API_URL}/driver/rides/history`,
  driverRideOffer: (rideId: number) => `${API_URL}/driver/rides/${rideId}/offer`,
  driverRideCancel: (rideId: number) => `${API_URL}/driver/rides/${rideId}/cancel`,
  driverRideComplete: (rideId: number) => `${API_URL}/driver/rides/${rideId}/complete`,
  driverRideRating: (rideId: number) => `${API_URL}/driver/rides/${rideId}/rating`,
  driverRideStart: (rideId: number) => `${API_URL}/driver/rides/${rideId}/start`,
  passengerOverview: `${API_URL}/passenger/overview`,
  passengerRegister: `${API_URL}/passenger/register`,
  passengerRides: `${API_URL}/passenger/rides`,
  passengerRideHistory: `${API_URL}/passenger/rides/history`,
  passengerRideRating: (rideId: number) =>
    `${API_URL}/passenger/rides/${rideId}/rating`,
  passengerRideOfferChoose: (offerId: number) =>
    `${API_URL}/passenger/ride-offers/${offerId}/choose`,
  rideCancel: (rideId: number) => `${API_URL}/rides/${rideId}/cancel`,
  rideStatus: (rideId: number) => `${API_URL}/rides/${rideId}/status`,
};
