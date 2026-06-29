"use client";

import { RideRatingFeedback } from "@/components/RideStarRating";
import { TriWheelLoadingScreen } from "@/components/TriWheelLoadingScreen";
import {
  buildNavigationUrl,
  getDriverNavigationTarget,
} from "@/lib/navigation";
import { buildPhoneCallHref } from "@/lib/phoneCall";
import { formatRideTypeLabel } from "@/lib/rideTypes";
import dynamic from "next/dynamic";
import { ReactNode } from "react";
import { driverStatusClass } from "./driverTypes";
import type { DriverRide } from "./driverTypes";

const DriverRouteMap = dynamic(
  () => import("./DriverRouteMap").then((module) => module.DriverRouteMap),
  {
    loading: () => (
      <TriWheelLoadingScreen
        compact
        message="Preparing the route map for this trip."
        title="Loading map"
      />
    ),
    ssr: false,
  },
);

export const driverTripButtonClass =
  "inline-flex min-h-11 w-full items-center justify-center rounded-xl px-3 py-2.5 text-xs font-black text-white sm:min-h-10 sm:rounded-lg sm:py-1.5 sm:text-[11px]";

const driverTripNavButtonClass = `${driverTripButtonClass} bg-[#1a73e8] shadow-sm shadow-blue-200 transition hover:bg-[#1558b0]`;

export function DriverRideCard({
  action,
  compact = false,
  embedded = false,
  inlineMap,
  ride,
  secondaryAction,
  showMap = false,
}: {
  action?: ReactNode;
  compact?: boolean;
  embedded?: boolean;
  inlineMap?: ReactNode;
  ride: DriverRide;
  secondaryAction?: ReactNode;
  showMap?: boolean;
}) {
  const hasRouteCoordinates =
    ride.pickup_lat !== null &&
    ride.pickup_lng !== null &&
    ride.dropoff_lat !== null &&
    ride.dropoff_lng !== null;
  const pickupPoint = hasRouteCoordinates
    ? { lat: ride.pickup_lat as number, lng: ride.pickup_lng as number }
    : null;
  const dropoffPoint = hasRouteCoordinates
    ? { lat: ride.dropoff_lat as number, lng: ride.dropoff_lng as number }
    : null;
  const navigationTarget = getDriverNavigationTarget(ride);
  const passengerCallHref = buildPhoneCallHref(ride.passenger_phone);
  const wrapperClassName = embedded
    ? "grid gap-3"
    : compact
      ? "rounded-2xl border border-slate-200 bg-white p-3 sm:p-4"
      : "rounded-3xl border border-slate-100 bg-slate-50 p-5";

  return (
    <div className={wrapperClassName}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className={compact ? "text-sm font-black" : "font-black"}>
              Ride #{ride.id}
            </div>
            {ride.is_emergency ? (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-700">
                Emergency
              </span>
            ) : null}
          </div>
          {!compact ? (
            <div className="mt-1 text-sm text-slate-500">
              {new Date(ride.created_at).toLocaleString()}
            </div>
          ) : null}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase sm:px-3 sm:text-xs ${driverStatusClass(
            ride.status,
          )}`}
        >
          {ride.status}
        </span>
      </div>
      <div
        className={
          compact
            ? "mt-3 grid gap-2 text-xs sm:grid-cols-2 sm:gap-x-4 sm:text-sm"
            : "mt-4 grid gap-3 text-sm sm:grid-cols-2"
        }
      >
        <p className="min-w-0">
          <span className="font-bold text-slate-500">Passenger:</span>{" "}
          {ride.passenger_name ?? "Passenger"}
        </p>
        <p>
          <span className="font-bold text-slate-500">Phone:</span>{" "}
          {passengerCallHref ? (
            <a
              className="font-black text-emerald-700 underline decoration-emerald-300 underline-offset-2"
              href={passengerCallHref}
            >
              {ride.passenger_phone}
            </a>
          ) : (
            (ride.passenger_phone ?? "N/A")
          )}
        </p>
        <p className="min-w-0 sm:col-span-2">
          <span className="font-bold text-slate-500">Pickup:</span>{" "}
          <span className="line-clamp-2">{ride.pickup_address}</span>
        </p>
        <p className="min-w-0 sm:col-span-2">
          <span className="font-bold text-slate-500">Drop-off:</span>{" "}
          <span className="line-clamp-2">{ride.dropoff_address}</span>
        </p>
        <p>
          <span className="font-bold text-slate-500">Type:</span>{" "}
          {formatRideTypeLabel(ride.ride_type)}
        </p>
        <p>
          <span className="font-bold text-slate-500">Fare:</span>{" "}
          {ride.fare !== null ? `PHP ${ride.fare.toFixed(2)}` : "Not set"}
        </p>
        {ride.driver_offer_status && (
          <p>
            <span className="font-bold text-slate-500">Your Offer:</span>{" "}
            {ride.driver_offer_status}
          </p>
        )}
      </div>
      {ride.status === "completed" && (
        <div className="mt-3 space-y-1 rounded-xl bg-slate-50 px-3 py-2">
          <RideRatingFeedback
            comment={ride.passenger_feedback}
            label="Passenger rated you:"
            rating={ride.rating}
            variant={ride.is_emergency ? "emergency" : "regular"}
          />
          <RideRatingFeedback
            comment={ride.driver_feedback}
            label="You rated passenger:"
            rating={ride.driver_rating}
            variant={ride.is_emergency ? "emergency" : "regular"}
          />
        </div>
      )}
      {inlineMap ? <div className={embedded ? "order-2" : undefined}>{inlineMap}</div> : null}
      {showMap && pickupPoint && dropoffPoint && (
        <div className="mt-5">
          <DriverRouteMap
            dropoff={dropoffPoint}
            pickup={pickupPoint}
            rideStatus={ride.status}
          />
        </div>
      )}
      {showMap && !hasRouteCoordinates && (
        <div className="mt-5 rounded-3xl bg-white p-4 text-sm font-bold text-slate-500">
          Route map will appear when pickup and drop-off pins are available.
        </div>
      )}
      {embedded ? (
        navigationTarget || action || secondaryAction ? (
          <div className="order-1 mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {navigationTarget ? (
              <a
                className={`${driverTripNavButtonClass} sm:col-span-2`}
                href={buildNavigationUrl(navigationTarget.point)}
                rel="noopener noreferrer"
                target="_blank"
              >
                {navigationTarget.label}
              </a>
            ) : null}
            {action}
            {secondaryAction}
          </div>
        ) : null
      ) : (
        <>
          {navigationTarget ? (
            <div className={compact ? "mt-3" : "mt-5"}>
              <a
                className={`inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#1a73e8] px-4 py-2.5 text-xs font-black text-white shadow-md shadow-blue-200 transition hover:bg-[#1558b0] sm:min-h-12 sm:rounded-2xl sm:px-5 sm:py-3 sm:text-sm ${
                  compact ? "" : "sm:w-auto"
                }`}
                href={buildNavigationUrl(navigationTarget.point)}
                rel="noopener noreferrer"
                target="_blank"
              >
                {navigationTarget.label}
              </a>
              {!compact ? (
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Opens OpenStreetMap directions on your phone or browser.
                </p>
              ) : null}
            </div>
          ) : null}
          {action || secondaryAction ? (
            <div
              className={
                compact
                  ? "mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3"
                  : "mt-5 flex flex-wrap gap-3"
              }
            >
              {action}
              {secondaryAction}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
