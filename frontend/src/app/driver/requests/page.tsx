"use client";

import { useStoredTriWheelSession } from "@/app/admin/AdminAccessGate";
import { AppShell } from "@/components/AppShell";
import { TriWheelLoadingScreen } from "@/components/TriWheelLoadingScreen";
import { apiRoutes } from "@/lib/api";
import { logoutTriWheel } from "@/lib/logout";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DriverPageHeader } from "../DriverPageHeader";
import { DriverRideCard } from "../DriverRideCard";
import { driverNavItems } from "../driverNav";
import { useDriverOverview } from "../useDriverOverview";

type StoredUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export default function DriverRequestsPage() {
  const router = useRouter();
  const { isChecking, user } = useStoredTriWheelSession() as {
    isChecking: boolean;
    user: StoredUser | null;
  };
  const { error, notice, overview, runDriverAction } = useDriverOverview(user?.id);

  useEffect(() => {
    if (!isChecking && user?.role !== "driver") {
      router.replace("/login?role=driver");
    }
  }, [isChecking, router, user]);

  function handleLogout() {
    void logoutTriWheel();
  }

  if (isChecking || !user || (!overview && !error)) {
    return (
      <TriWheelLoadingScreen
        message="Loading open passenger requests you can offer on."
        title="Opening Ride Requests"
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
        <DriverPageHeader
          description="Send an offer for rides you can take. The passenger will choose from the drivers who offered."
          eyebrow="Driver Trips"
          title="Ride Requests"
        />

        {error && <div className="tw-alert-error mt-6">{error}</div>}
        {notice && <div className="tw-alert-success mt-6">{notice}</div>}

        <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          {overview?.available_requests.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {overview.available_requests.map((ride) => (
                <DriverRideCard
                  action={
                    <button
                      className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      disabled={
                        overview.driver.status !== "online" ||
                        Boolean(overview.active_ride) ||
                        ride.driver_offer_status === "pending"
                      }
                      onClick={() =>
                        runDriverAction(
                          `offer-${ride.id}`,
                          apiRoutes.driverRideOffer(ride.id),
                          "Offer sent to passenger successfully.",
                        )
                      }
                      type="button"
                    >
                      {ride.driver_offer_status === "pending"
                        ? "Offer Sent"
                        : "Send Offer"}
                    </button>
                  }
                  key={ride.id}
                  ride={ride}
                  showMap
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl bg-slate-50 p-8 text-center">
              <p className="font-black">No ride requests yet.</p>
              <p className="mt-1 text-sm text-slate-500">
                Go online from the Status page to start receiving requests.
              </p>
            </div>
          )}
        </section>
      </section>
    </AppShell>
  );
}
