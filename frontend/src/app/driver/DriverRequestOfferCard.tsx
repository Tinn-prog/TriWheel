"use client";

import { formatRideTypeLabel } from "@/lib/rideTypes";
import type { DriverRide } from "./driverTypes";

export function DriverRequestOfferCard({
  disabled,
  onFocus,
  onOffer,
  ride,
  selected = false,
}: {
  disabled: boolean;
  onFocus?: () => void;
  onOffer: () => void;
  ride: DriverRide;
  selected?: boolean;
}) {
  const offerSent = ride.driver_offer_status === "pending";

  return (
    <article
      className={`rounded-xl border p-3 transition ${
        selected
          ? "border-orange-300 bg-orange-50 ring-2 ring-orange-200"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <button
        className="w-full text-left"
        onClick={onFocus}
        type="button"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-black text-slate-900">Ride #{ride.id}</p>
              {ride.is_emergency ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase text-red-700">
                  Emergency
                </span>
              ) : null}
            </div>
            <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-700">
              {ride.pickup_address}
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
              to {ride.dropoff_address}
            </p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              {formatRideTypeLabel(ride.ride_type)}
              {ride.passenger_name ? ` · ${ride.passenger_name}` : ""}
            </p>
          </div>
          <p className="shrink-0 text-sm font-black text-slate-900">
            {ride.fare !== null ? `PHP ${ride.fare.toFixed(0)}` : "--"}
          </p>
        </div>
      </button>
      <button
        className="mt-3 min-h-10 w-full rounded-xl bg-orange-500 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300 sm:text-sm"
        disabled={disabled || offerSent}
        onClick={onOffer}
        type="button"
      >
        {offerSent ? "Offer Sent" : "Send Offer"}
      </button>
    </article>
  );
}
