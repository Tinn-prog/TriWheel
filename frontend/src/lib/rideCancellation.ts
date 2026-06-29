export const passengerCancelReasons = [
  { code: "changed_plans", label: "Change of plans" },
  { code: "wrong_location", label: "Wrong pickup or drop-off" },
  { code: "wait_too_long", label: "Wait time was too long" },
  { code: "found_another_ride", label: "Found another ride" },
  { code: "driver_unavailable", label: "Driver was unavailable" },
  { code: "booked_by_mistake", label: "Booked by mistake" },
  { code: "other", label: "Other reason" },
] as const;

export const driverCancelReasons = [
  { code: "passenger_no_show", label: "Passenger no-show" },
  { code: "wrong_location", label: "Incorrect pickup or drop-off" },
  { code: "vehicle_issue", label: "Vehicle problem" },
  { code: "personal_emergency", label: "Personal emergency" },
  { code: "passenger_requested", label: "Passenger requested cancellation" },
  { code: "unsafe_conditions", label: "Unsafe conditions" },
  { code: "other", label: "Other reason" },
] as const;

export type PassengerCancelReasonCode =
  (typeof passengerCancelReasons)[number]["code"];

export type DriverCancelReasonCode =
  (typeof driverCancelReasons)[number]["code"];

export type CancelReasonCode = PassengerCancelReasonCode | DriverCancelReasonCode;

export type CancelReasonOption = {
  code: CancelReasonCode;
  label: string;
};
