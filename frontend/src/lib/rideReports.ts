export const passengerReportReasons = [
  { code: "rude_behavior", label: "Rude or disrespectful behavior" },
  { code: "unsafe_driving", label: "Unsafe driving" },
  { code: "wrong_route", label: "Wrong route or detour" },
  { code: "vehicle_condition", label: "Poor vehicle condition" },
  { code: "harassment", label: "Harassment or threats" },
  { code: "fare_dispute", label: "Fare dispute" },
  { code: "no_show", label: "Driver never arrived" },
  { code: "other", label: "Other concern" },
] as const;

export const driverReportReasons = [
  { code: "rude_behavior", label: "Rude or disrespectful behavior" },
  { code: "harassment", label: "Harassment or threats" },
  { code: "no_show", label: "Passenger no-show" },
  { code: "wrong_location", label: "Wrong pickup information" },
  { code: "unsafe_behavior", label: "Unsafe or disruptive behavior" },
  { code: "fare_dispute", label: "Fare payment dispute" },
  { code: "other", label: "Other concern" },
] as const;

export type PassengerReportReasonCode =
  (typeof passengerReportReasons)[number]["code"];

export type DriverReportReasonCode =
  (typeof driverReportReasons)[number]["code"];

export type ReportReasonCode = PassengerReportReasonCode | DriverReportReasonCode;

export type ReportReasonOption = {
  code: ReportReasonCode;
  label: string;
};
