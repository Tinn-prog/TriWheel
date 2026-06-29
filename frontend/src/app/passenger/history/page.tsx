"use client";

import { useStoredTriWheelSession } from "@/app/admin/AdminAccessGate";
import { AppShell } from "@/components/AppShell";
import { passengerNavItems } from "@/app/passenger/passengerNav";
import { RideRatingFeedback, RideRatingForm } from "@/components/RideStarRating";
import { RideReportDialog } from "@/components/RideReportDialog";
import { TriWheelLoadingScreen } from "@/components/TriWheelLoadingScreen";
import { useRideReport } from "@/hooks/useRideReport";
import { apiRoutes } from "@/lib/api";
import { logoutTriWheel } from "@/lib/logout";
import { rideRatingVariant } from "@/lib/rideRatingCopy";
import {
  dismissRatingRide,
  readDismissedRatingRideIds,
} from "@/lib/rideFeedbackDismiss";
import {
  passengerReportReasons,
  type PassengerReportReasonCode,
} from "@/lib/rideReports";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

type StoredUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type Ride = {
  id: number;
  pickup_address: string;
  dropoff_address: string;
  ride_type: string | null;
  status: string;
  is_emergency?: boolean;
  fare: number | null;
  created_at: string;
  driver_name: string | null;
  driver_phone: string | null;
  vehicle_type: string | null;
  plate_number: string | null;
  vehicle_color: string | null;
  rating: string | null;
  passenger_feedback: string | null;
  passenger_rated: boolean;
  driver_rating: string | null;
  driver_feedback: string | null;
  driver_rated: boolean;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
  can_report?: boolean;
  report_submitted?: boolean;
};

type PassengerOverview = {
  stats: {
    total_rides: number;
    completed: number;
    cancelled: number;
    active: number;
  };
  ride_history: Ride[];
  hidden_history_count?: number;
};

function statusClass(status: string) {
  if (status === "completed") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "cancelled") {
    return "bg-red-100 text-red-700";
  }

  return "bg-orange-100 text-orange-700";
}

function formatFare(fare: number | null) {
  return fare !== null ? `PHP ${fare.toFixed(2)}` : "Waiting for estimate";
}

function formatRideDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatVehicleSummary(ride: Ride) {
  const parts = [ride.vehicle_type, ride.plate_number].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No vehicle";
}

export default function PassengerHistoryPage() {
  const router = useRouter();
  const { isChecking, user } = useStoredTriWheelSession() as {
    isChecking: boolean;
    user: StoredUser | null;
  };
  const [overview, setOverview] = useState<PassengerOverview | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [ratingRideId, setRatingRideId] = useState<number | null>(null);
  const [dismissedRatingRideIds, setDismissedRatingRideIds] = useState<number[]>(
    [],
  );
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportRideId, setReportRideId] = useState<number | null>(null);

  const loadOverview = useCallback(async (userId: number) => {
    const response = await fetch(`${apiRoutes.passengerOverview}?user_id=${userId}`);

    if (!response.ok) {
      throw new Error("Unable to load ride history.");
    }

    setOverview((await response.json()) as PassengerOverview);
  }, []);

  const {
    error: reportError,
    isSubmitting: isSubmittingReport,
    submitReport,
  } = useRideReport(user?.id, () => {
    if (user) {
      void loadOverview(user.id);
    }
    setNotice("Report submitted. TriWheel admins will review it.");
  });

  useEffect(() => {
    if (!isChecking && user?.role !== "passenger") {
      router.replace("/login?role=passenger");
    }
  }, [isChecking, router, user]);

  useEffect(() => {
    setDismissedRatingRideIds(readDismissedRatingRideIds());
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const userId = user.id;

    async function loadHistory() {
      try {
        await loadOverview(userId);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load ride history.",
        );
      }
    }

    void loadHistory();
  }, [loadOverview, user]);

  async function handleHistoryVisibility(action: "hide" | "unhide") {
    if (!user) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const response = await fetch(apiRoutes.passengerRideHistory, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: user.id, action }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(
          data.message ??
            (action === "hide"
              ? "Unable to hide ride history."
              : "Unable to restore ride history."),
        );
      }

      setNotice(
        data.message ??
          (action === "hide"
            ? "Ride history hidden successfully."
            : "Ride history restored successfully."),
      );
      await loadOverview(user.id);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : action === "hide"
            ? "Unable to hide ride history."
            : "Unable to restore ride history.",
      );
    }
  }

  async function handleRateDriver(
    event: FormEvent<HTMLFormElement>,
    rideId: number,
  ) {
    event.preventDefault();

    if (!user) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    setError("");
    setNotice("");
    setRatingRideId(rideId);

    try {
      const response = await fetch(apiRoutes.passengerRideRating(rideId), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          rating: Number(formData.get("rating") ?? 0),
          feedback: String(formData.get("feedback") ?? ""),
        }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to submit feedback.");
      }

      setNotice(data.message ?? "Feedback submitted successfully.");
      form.reset();
      await loadOverview(user.id);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to submit feedback.",
      );
    } finally {
      setRatingRideId(null);
    }
  }

  function handleLogout() {
    void logoutTriWheel();
  }

  if (isChecking || !user || (!overview && !error)) {
    return (
      <TriWheelLoadingScreen
        message="Loading your previous trips, fares, and ride details."
        title="Opening Ride History"
      />
    );
  }

  const hasHiddenHistory = (overview?.hidden_history_count ?? 0) > 0;
  const canHideHistory = Boolean(
    overview?.ride_history.some((ride) =>
      ["completed", "cancelled"].includes(ride.status),
    ),
  );

  return (
    <>
    <AppShell
      dashboardLabel="Passenger Dashboard"
      navItems={passengerNavItems}
      onLogout={handleLogout}
      user={user}
    >
      <section className="mx-auto w-full max-w-6xl min-w-0">
        <header className="rounded-[1.75rem] bg-gradient-to-br from-orange-500 via-orange-600 to-orange-800 p-5 text-white shadow-xl shadow-orange-200 sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-100 sm:text-sm">
                Passenger Trips
              </p>
              <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
                Ride History
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-orange-50 sm:mt-3 sm:text-base">
                Review your requested, completed, and cancelled trips in one
                dedicated page.
              </p>
            </div>
            <Link
              className="tw-btn-secondary min-h-11 bg-white px-4 py-2.5 text-sm text-orange-700 hover:bg-white"
              href="/passenger"
            >
              Back to Dashboard
            </Link>
          </div>
        </header>

        {error && <div className="tw-alert-error mt-6">{error}</div>}
        {reportError && <div className="tw-alert-error mt-6">{reportError}</div>}
        {notice && <div className="tw-alert-success mt-6">{notice}</div>}

        <section className="mt-4 grid grid-cols-4 divide-x divide-slate-200 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          {[
            ["Total", overview?.stats.total_rides ?? 0],
            ["Active", overview?.stats.active ?? 0],
            ["Complete", overview?.stats.completed ?? 0],
            ["Cancel", overview?.stats.cancelled ?? 0],
          ].map(([label, value]) => (
            <div className="min-w-0 px-1 py-2 text-center sm:px-2" key={label}>
              <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p className="mt-0.5 text-lg font-black tabular-nums leading-none sm:text-xl">
                {value}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-4 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black">Trip Records</h2>
              <p className="text-xs text-slate-500">
                Completed and cancelled rides can be hidden from this page.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canHideHistory}
                onClick={() => void handleHistoryVisibility("hide")}
                type="button"
              >
                Hide History
              </button>
              {hasHiddenHistory ? (
                <button
                  className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700"
                  onClick={() => void handleHistoryVisibility("unhide")}
                  type="button"
                >
                  Unhide History
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            {overview?.ride_history.length ? (
              overview.ride_history.map((ride) => (
                <article
                  className="rounded-lg border border-slate-100 bg-slate-50/80 p-3"
                  key={ride.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800">
                        Ride #{ride.id}
                        <span className="ml-1.5 font-normal text-slate-400">
                          {formatRideDate(ride.created_at)}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {formatFare(ride.fare)} · {ride.driver_name ?? "No driver"} ·{" "}
                        {formatVehicleSummary(ride)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(
                        ride.status,
                      )}`}
                    >
                      {ride.status}
                    </span>
                  </div>
                  <div className="mt-2 space-y-0.5 text-xs text-slate-600">
                    <p className="line-clamp-1">
                      <span className="font-semibold text-slate-400">From </span>
                      {ride.pickup_address}
                    </p>
                    <p className="line-clamp-1">
                      <span className="font-semibold text-slate-400">To </span>
                      {ride.dropoff_address}
                    </p>
                  </div>
                  {ride.status === "cancelled" && ride.cancellation_reason ? (
                    <p className="mt-2 border-t border-slate-200/80 pt-2 text-xs text-slate-600">
                      <span className="font-semibold text-slate-500">
                        {ride.cancelled_by === "passenger"
                          ? "You cancelled:"
                          : ride.cancelled_by === "driver"
                            ? "Driver cancelled:"
                            : "Cancellation reason:"}
                      </span>{" "}
                      {ride.cancellation_reason}
                    </p>
                  ) : null}
                  {ride.can_report ? (
                    <button
                      className="mt-2 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
                      disabled={isSubmittingReport}
                      onClick={() => {
                        setReportRideId(ride.id);
                        setShowReportDialog(true);
                      }}
                      type="button"
                    >
                      Report Driver
                    </button>
                  ) : ride.report_submitted ? (
                    <p className="mt-2 text-xs font-semibold text-amber-700">
                      Report submitted for admin review.
                    </p>
                  ) : null}
                  {ride.status === "completed" && (
                    <div className="mt-2 space-y-1 border-t border-slate-200/80 pt-2">
                      <RideRatingFeedback
                        comment={ride.passenger_feedback}
                        label="You:"
                        rating={ride.rating}
                        variant={rideRatingVariant(Boolean(ride.is_emergency))}
                      />
                      <RideRatingFeedback
                        comment={ride.driver_feedback}
                        label="Driver:"
                        rating={ride.driver_rating}
                        variant={rideRatingVariant(Boolean(ride.is_emergency))}
                      />

                      {!ride.passenger_rated &&
                      !dismissedRatingRideIds.includes(ride.id) ? (
                        <RideRatingForm
                          audience="passenger"
                          compact
                          isSubmitting={ratingRideId === ride.id}
                          onCancel={() => {
                            dismissRatingRide(ride.id);
                            setDismissedRatingRideIds(readDismissedRatingRideIds());
                          }}
                          onSubmit={(event) => handleRateDriver(event, ride.id)}
                          variant={rideRatingVariant(Boolean(ride.is_emergency))}
                        />
                      ) : null}
                    </div>
                  )}
                </article>
              ))
            ) : (
              <div className="rounded-lg bg-slate-50 p-6 text-center">
                <p className="text-sm font-bold">
                  {hasHiddenHistory ? "Ride history is hidden." : "No ride history yet."}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {hasHiddenHistory
                    ? "Click Unhide History to show your completed and cancelled trips again."
                    : "Completed and cancelled rides will appear here."}
                </p>
              </div>
            )}
          </div>
        </section>
      </section>
    </AppShell>

    <RideReportDialog<PassengerReportReasonCode>
      description="Tell TriWheel what happened. Reports are reviewed by admins."
      detailPlaceholder="Describe the issue with this driver..."
      isOpen={showReportDialog}
      isSubmitting={isSubmittingReport}
      onClose={() => {
        setShowReportDialog(false);
        setReportRideId(null);
      }}
      onConfirm={async (payload) => {
        if (!reportRideId) {
          return;
        }

        const succeeded = await submitReport(reportRideId, payload);

        if (succeeded) {
          setShowReportDialog(false);
          setReportRideId(null);
        }
      }}
      reasons={passengerReportReasons}
      title="Report driver"
    />
    </>
  );
}
