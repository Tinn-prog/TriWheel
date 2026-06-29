export type DriverRide = {
  id: number;
  passenger_name: string | null;
  passenger_phone: string | null;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  ride_type: string | null;
  status: string;
  is_emergency?: boolean;
  fare: number | null;
  created_at: string;
  driver_offer_status: string | null;
  rating: string | null;
  passenger_feedback: string | null;
  passenger_rated: boolean;
  driver_rating: string | null;
  driver_feedback: string | null;
  driver_rated: boolean;
  cancelled_by?: string | null;
  cancellation_reason_code?: string | null;
  cancellation_reason?: string | null;
  can_report?: boolean;
  report_submitted?: boolean;
};

export type DriverSuspensionState = {
  is_suspended: boolean;
  reason: string | null;
  suspended_at: string | null;
  appeal_deadline_at: string | null;
  appeal_submitted_at: string | null;
  appeal_message: string | null;
  can_submit_appeal: boolean;
  appeal_submitted: boolean;
  requires_office_visit: boolean;
  account_permanently_closed: boolean;
  account_permanently_closed_at: string | null;
  hours_remaining: number;
};

export type DriverOverview = {
  driver: {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    status: "online" | "offline";
    approval_status: "pending" | "approved" | "rejected";
    auto_accept: boolean;
    queue_position: number | null;
    license_number: string | null;
    license_expiry_date: string | null;
    toda_id_number: string | null;
    toda_association: string | null;
    vehicle_type: string | null;
    plate_number: string | null;
    vehicle_color: string | null;
    vehicle: {
      body_number: string | null;
      color: string | null;
      has_orcr_file: boolean;
      has_vehicle_photo: boolean;
      plate_number: string | null;
      registration_expiry_date: string | null;
      vehicle_type: string | null;
    } | null;
  };
  active_ride: DriverRide | null;
  available_requests: DriverRide[];
  ride_history: DriverRide[];
  stats: {
    total_rides: number;
    completed: number;
    cancelled: number;
    active: number;
  };
  suspension?: DriverSuspensionState | null;
};

export function driverStatusClass(status: string) {
  if (status === "completed" || status === "online" || status === "approved") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "cancelled" || status === "rejected") {
    return "bg-red-100 text-red-700";
  }

  return "bg-orange-100 text-orange-700";
}
