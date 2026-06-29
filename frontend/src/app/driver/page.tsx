"use client";

import { useStoredTriWheelSession } from "@/app/admin/AdminAccessGate";
import { AppShell } from "@/components/AppShell";
import { NotificationBell } from "@/components/NotificationBell";
import { RideCancelDialog } from "@/components/RideCancelDialog";
import { RideReportDialog } from "@/components/RideReportDialog";
import { RideContactPanel } from "@/components/RideContactPanel";
import { TriWheelLoadingScreen } from "@/components/TriWheelLoadingScreen";
import { useRideReport } from "@/hooks/useRideReport";
import { apiRoutes } from "@/lib/api";
import { logoutTriWheel } from "@/lib/logout";
import {
  driverCancelReasons,
  type DriverCancelReasonCode,
} from "@/lib/rideCancellation";
import {
  driverReportReasons,
  type DriverReportReasonCode,
} from "@/lib/rideReports";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { driverNavItems } from "./driverNav";
import { DriverRequestOfferCard } from "./DriverRequestOfferCard";
import { DriverRideCard, driverTripButtonClass } from "./DriverRideCard";
import { DriverSuspensionPanel } from "./DriverSuspensionPanel";
import { driverStatusClass } from "./driverTypes";
import { useDriverOverview } from "./useDriverOverview";

const DriverDashboardMap = dynamic(
  () =>
    import("./DriverDashboardMap").then((module) => module.DriverDashboardMap),
  {
    loading: () => (
      <div className="tw-map-shell flex h-52 items-center justify-center bg-slate-100 text-sm font-semibold text-slate-500 sm:h-64 lg:h-72">
        Loading map...
      </div>
    ),
    ssr: false,
  },
);

type StoredUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export default function DriverStatusPage() {
  const router = useRouter();
  const { isChecking, user } = useStoredTriWheelSession() as {
    isChecking: boolean;
    user: StoredUser | null;
  };
  const {
    busyAction,
    error,
    loadOverview,
    notice,
    overview,
    runDriverAction,
    setNotice,
    updateAutoAccept,
  } = useDriverOverview(user?.id);
  const [focusedRequestId, setFocusedRequestId] = useState<number | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportRideId, setReportRideId] = useState<number | null>(null);

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
    if (!overview?.available_requests.length) {
      setFocusedRequestId(null);
      return;
    }

    if (
      focusedRequestId !== null &&
      !overview.available_requests.some((ride) => ride.id === focusedRequestId)
    ) {
      setFocusedRequestId(null);
    }
  }, [focusedRequestId, overview?.available_requests]);

  useEffect(() => {
    if (!isChecking && user?.role !== "driver") {
      router.replace("/login?role=driver");
    }
  }, [isChecking, router, user]);

  function handleLogout() {
    void logoutTriWheel();
  }

  const activeRide = overview?.active_ride ?? null;
  const isSuspended = Boolean(overview?.suspension?.is_suspended);
  const hasActiveTrip = Boolean(
    activeRide && ["accepted", "ongoing"].includes(activeRide.status),
  );
  const isCancellingRide = Boolean(
    activeRide && busyAction === `cancel-${activeRide.id}`,
  );

  async function handleCancelRide(payload: {
    cancellation_reason_code: DriverCancelReasonCode;
    cancellation_reason_detail?: string;
  }) {
    if (!activeRide) {
      return;
    }

    const succeeded = await runDriverAction(
      `cancel-${activeRide.id}`,
      apiRoutes.driverRideCancel(activeRide.id),
      "Ride cancelled successfully.",
      {
        cancellation_reason_code: payload.cancellation_reason_code,
        cancellation_reason_detail: payload.cancellation_reason_detail,
      },
    );

    if (succeeded) {
      setShowCancelDialog(false);
    }
  }

  async function handleReportRide(payload: {
    report_reason_code: DriverReportReasonCode;
    report_reason_detail?: string;
  }) {
    if (!reportRideId) {
      return;
    }

    const succeeded = await submitReport(reportRideId, payload);

    if (succeeded) {
      setShowReportDialog(false);
      setReportRideId(null);
    }
  }

  function openReportDialog(rideId: number) {
    setReportRideId(rideId);
    setShowReportDialog(true);
  }

  if (isChecking || !user) {
    return (
      <TriWheelLoadingScreen
        message="Checking your driver session and loading your status."
        title="Driver Access"
      />
    );
  }

  return (
    <AppShell
      dashboardLabel="Driver Dashboard"
      navItems={driverNavItems}
      onLogout={handleLogout}
      user={user}
    >
      <section className="mx-auto w-full max-w-6xl min-w-0">
        <header className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 p-4 text-white shadow-xl shadow-orange-200 sm:rounded-[1.75rem] sm:p-6 lg:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-100 sm:text-sm sm:tracking-[0.28em]">
                Driver Dashboard
              </p>
              <h1 className="mt-1.5 text-xl font-black leading-tight sm:mt-2 sm:text-3xl lg:text-4xl">
                Welcome, {overview?.driver.name ?? user.name}.
              </h1>
              <p className="mt-1.5 text-xs leading-5 text-orange-50 sm:mt-2 sm:max-w-2xl sm:text-sm sm:leading-6 lg:text-base">
                {hasActiveTrip
                  ? "Manage your current trip, navigation, and online status in one place."
                  : "Go online, send offers to passengers, and manage trips after a passenger chooses you."}
              </p>
            </div>
            <NotificationBell href="/driver/notifications" userId={user.id} />
          </div>
        </header>

        {error && <div className="tw-alert-error mt-6">{error}</div>}
        {reportError && <div className="tw-alert-error mt-6">{reportError}</div>}
        {notice && !isSuspended ? <div className="tw-alert-success mt-6">{notice}</div> : null}

        {!overview ? (
          <div className="mt-8 rounded-[2rem] bg-white p-8 text-center font-black shadow-sm ring-1 ring-slate-200">
            Loading driver dashboard...
          </div>
        ) : isSuspended && overview.suspension ? (
          <DriverSuspensionPanel
            driverName={overview.driver.name ?? user.name}
            onAppealSubmitted={async () => {
              await loadOverview(user.id);
            }}
            suspension={overview.suspension}
            userId={user.id}
          />
        ) : (
          <>
            {overview.driver.approval_status !== "approved" && (
              <div className="mt-8 rounded-2xl bg-amber-50 p-5 font-bold text-amber-800">
                Verification status: {overview.driver.approval_status}. You can
                go online once an admin approves your driver profile.
              </div>
            )}

            <section className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 lg:grid-cols-4 lg:gap-3">
              {(
                [
                  ["Status", "Status", overview.driver.status],
                  ["Open Requests", "Requests", overview.available_requests.length],
                  [
                    "Offers Sent",
                    "Offers",
                    overview.available_requests.filter(
                      (ride) => ride.driver_offer_status === "pending",
                    ).length,
                  ],
                  ["Vehicle", "Vehicle", overview.driver.plate_number ?? "No plate"],
                ] as const
              ).map(([label, shortLabel, value]) => (
                <article
                  className="min-w-0 rounded-2xl bg-white px-3 py-3 shadow-sm ring-1 ring-slate-200 sm:rounded-3xl sm:p-4"
                  key={label}
                >
                  <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs sm:tracking-[0.18em]">
                    <span className="sm:hidden">{shortLabel}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </p>
                  <p className="mt-1 truncate text-lg font-black capitalize tabular-nums leading-tight sm:mt-2 sm:text-2xl lg:text-3xl">
                    {value}
                  </p>
                </article>
              ))}
            </section>

            <article className="mt-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:mt-5 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-black text-slate-900 sm:text-lg">
                    Driver Status
                  </h2>
                  <p className="mt-0.5 text-xs leading-5 text-slate-600 sm:text-sm">
                    {overview.driver.status === "online"
                      ? "Online — ready for passenger requests."
                      : "Offline — not receiving requests."}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide sm:px-4 sm:py-2 sm:text-xs ${driverStatusClass(
                    overview.driver.status,
                  )}`}
                >
                  {overview.driver.status}
                </span>
              </div>

              {overview.active_ride && overview.driver.status === "online" ? (
                <p className="mt-2.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900 sm:text-sm">
                  Active ride in progress. Complete or cancel it before going
                  offline. Stay on local streets and use the rightmost lane where
                  allowed — avoid major highways unless permitted.
                </p>
              ) : null}

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  className="min-h-11 rounded-xl bg-emerald-500 px-3 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300 sm:min-h-12 sm:rounded-2xl sm:px-5 sm:py-3 sm:text-sm"
                  disabled={
                    overview.driver.approval_status !== "approved" ||
                    overview.driver.status === "online" ||
                    busyAction === "status-online"
                  }
                  onClick={() =>
                    runDriverAction(
                      "status-online",
                      apiRoutes.driverStatus,
                      "You are now online.",
                      { status: "online" },
                    )
                  }
                  type="button"
                >
                  {busyAction === "status-online" ? "Going online..." : "Go Online"}
                </button>
                <button
                  className="min-h-11 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300 sm:min-h-12 sm:rounded-2xl sm:px-5 sm:py-3 sm:text-sm"
                  disabled={
                    overview.driver.status === "offline" ||
                    Boolean(overview.active_ride) ||
                    busyAction === "status-offline"
                  }
                  onClick={() =>
                    runDriverAction(
                      "status-offline",
                      apiRoutes.driverStatus,
                      "You are now offline.",
                      { status: "offline" },
                    )
                  }
                  type="button"
                >
                  {busyAction === "status-offline" ? "Going offline..." : "Go Offline"}
                </button>
              </div>

              <label className="mt-3 flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:mt-4 sm:items-start sm:gap-3 sm:rounded-2xl sm:p-3.5">
                <input
                  checked={overview.driver.auto_accept}
                  className="size-4 shrink-0 accent-orange-600 sm:mt-0.5"
                  disabled={
                    overview.driver.approval_status !== "approved" ||
                    busyAction === "auto-accept" ||
                    Boolean(overview.active_ride)
                  }
                  onChange={(event) => void updateAutoAccept(event.target.checked)}
                  type="checkbox"
                />
                <span className="min-w-0 grid gap-0.5">
                  <span className="text-xs font-black text-slate-900 sm:text-sm">
                    Auto-accept requests
                  </span>
                  <span className="text-[11px] leading-4 text-slate-600 sm:text-xs sm:leading-5">
                    <span className="sm:hidden">
                      Auto-send offers while online.
                    </span>
                    <span className="hidden sm:inline">
                      While online, TriWheel automatically sends your offer for
                      new passenger requests. You still get the ride only when
                      the passenger chooses you.
                    </span>
                  </span>
                  {overview.active_ride ? (
                    <span className="text-[11px] font-semibold text-amber-700 sm:text-xs">
                      Paused while you have an active ride.
                    </span>
                  ) : overview.driver.auto_accept &&
                    overview.driver.status === "online" ? (
                    <span className="text-[11px] font-semibold text-emerald-700 sm:text-xs">
                      Watching for new requests.
                    </span>
                  ) : null}
                </span>
              </label>
             </article>

            <section className="mt-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:mt-5 sm:p-4">
              <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3">
                <h2 className="text-sm font-black text-slate-900 sm:text-base">
                  {hasActiveTrip ? "Current Trip" : "Map & Ride Requests"}
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:text-xs">
                  {hasActiveTrip
                    ? `Trip #${activeRide?.id ?? ""}`
                    : overview.available_requests.length
                      ? `${overview.available_requests.length} open`
                      : "Nearby"}
                </span>
              </div>

              {hasActiveTrip && activeRide ? (
                <>
                  <DriverRideCard
                    action={
                      activeRide.status === "accepted" ? (
                        <button
                          className={`${driverTripButtonClass} bg-orange-500`}
                          onClick={() =>
                            runDriverAction(
                              `start-${activeRide.id}`,
                              apiRoutes.driverRideStart(activeRide.id),
                              "Ride started successfully.",
                            )
                          }
                          type="button"
                        >
                          Start Ride
                        </button>
                      ) : activeRide.status === "ongoing" ? (
                        <button
                          className={`${driverTripButtonClass} bg-emerald-500`}
                          onClick={() =>
                            runDriverAction(
                              `complete-${activeRide.id}`,
                              apiRoutes.driverRideComplete(activeRide.id),
                              "Ride completed successfully.",
                            )
                          }
                          type="button"
                        >
                          Complete Ride
                        </button>
                      ) : undefined
                    }
                    compact
                    embedded
                    inlineMap={
                      <DriverDashboardMap
                        activeRide={activeRide}
                        availableRequests={[]}
                      />
                    }
                    ride={activeRide}
                    secondaryAction={
                      <>
                        {["accepted", "ongoing"].includes(activeRide.status) ? (
                          <button
                            className={`${driverTripButtonClass} bg-red-500`}
                            disabled={isCancellingRide}
                            onClick={() => setShowCancelDialog(true)}
                            type="button"
                          >
                            {isCancellingRide ? "Cancelling..." : "Cancel Ride"}
                          </button>
                        ) : undefined}
                        {activeRide.can_report ? (
                          <button
                            className={`${driverTripButtonClass} bg-amber-500 sm:col-span-2`}
                            disabled={isSubmittingReport}
                            onClick={() => openReportDialog(activeRide.id)}
                            type="button"
                          >
                            Report Passenger
                          </button>
                        ) : activeRide.report_submitted ? (
                          <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-[11px] font-semibold text-amber-800 sm:col-span-2">
                            Report submitted for admin review.
                          </p>
                        ) : null}
                      </>
                    }
                  />
                  <div className="mt-3">
                    <RideContactPanel
                      contactName={activeRide.passenger_name ?? "Passenger"}
                      contactPhone={activeRide.passenger_phone}
                      enabled
                      messagesHref={`/driver/messages?ride=${activeRide.id}`}
                      rideId={activeRide.id}
                      userId={user.id}
                      viewerRole="driver"
                    />
                  </div>
                </>
              ) : (
                <>
                  {overview.driver.status === "online" ? (
                    overview.available_requests.length ? (
                      <div className="mb-4 grid max-h-64 gap-2 overflow-y-auto sm:max-h-72 sm:grid-cols-2">
                        {overview.available_requests.map((ride) => (
                          <DriverRequestOfferCard
                            disabled={Boolean(overview.active_ride)}
                            key={ride.id}
                            onFocus={() => setFocusedRequestId(ride.id)}
                            onOffer={() =>
                              runDriverAction(
                                `offer-${ride.id}`,
                                apiRoutes.driverRideOffer(ride.id),
                                "Offer sent to passenger successfully.",
                              )
                            }
                            ride={ride}
                            selected={focusedRequestId === ride.id}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="mb-4 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-500 sm:text-sm">
                        No open ride requests right now. New passenger requests
                        will appear here and on the map.
                      </p>
                    )
                  ) : (
                    <p className="mb-4 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-500 sm:text-sm">
                      Go online to see nearby ride requests on the map.
                    </p>
                  )}

                  <DriverDashboardMap
                    activeRide={overview.active_ride}
                    availableRequests={overview.available_requests}
                    focusedRequestId={focusedRequestId}
                  />
                </>
              )}
            </section>
          </>
        )}
      </section>

      {hasActiveTrip && activeRide ? (
        <div className="tw-driver-trip-bar fixed inset-x-0 z-[1050] border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur-md lg:hidden">
          <div className="mx-auto grid w-full max-w-6xl gap-2">
            {activeRide.status === "accepted" ? (
              <button
                className={`${driverTripButtonClass} bg-orange-500`}
                onClick={() =>
                  runDriverAction(
                    `start-${activeRide.id}`,
                    apiRoutes.driverRideStart(activeRide.id),
                    "Ride started successfully.",
                  )
                }
                type="button"
              >
                Start Ride
              </button>
            ) : activeRide.status === "ongoing" ? (
              <button
                className={`${driverTripButtonClass} bg-emerald-500`}
                onClick={() =>
                  runDriverAction(
                    `complete-${activeRide.id}`,
                    apiRoutes.driverRideComplete(activeRide.id),
                    "Ride completed successfully.",
                  )
                }
                type="button"
              >
                Complete Ride
              </button>
            ) : null}
            <button
              className={`${driverTripButtonClass} bg-red-500`}
              disabled={isCancellingRide}
              onClick={() => setShowCancelDialog(true)}
              type="button"
            >
              {isCancellingRide ? "Cancelling..." : "Cancel Ride"}
            </button>
          </div>
        </div>
      ) : null}

      {hasActiveTrip ? <div aria-hidden className="h-32 shrink-0 lg:hidden" /> : null}

      <RideCancelDialog<DriverCancelReasonCode>
        description="Choose a reason so the passenger knows why this ride was cancelled."
        detailPlaceholder="Tell the passenger why you are cancelling..."
        isOpen={showCancelDialog}
        isSubmitting={isCancellingRide}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={(payload) => void handleCancelRide(payload)}
        reasons={driverCancelReasons}
        title="Why are you cancelling?"
      />

      <RideReportDialog<DriverReportReasonCode>
        description="Tell TriWheel what happened. Reports are reviewed by admins and are not shared directly with the passenger."
        detailPlaceholder="Describe the issue with this passenger..."
        isOpen={showReportDialog}
        isSubmitting={isSubmittingReport}
        onClose={() => {
          setShowReportDialog(false);
          setReportRideId(null);
        }}
        onConfirm={(payload) => void handleReportRide(payload)}
        reasons={driverReportReasons}
        title="Report passenger"
      />
    </AppShell>
  );
}
