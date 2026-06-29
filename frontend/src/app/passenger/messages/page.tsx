"use client";

import { Suspense } from "react";
import { useStoredTriWheelSession } from "@/app/admin/AdminAccessGate";
import { AppShell } from "@/components/AppShell";
import { RideMessagesDashboard } from "@/components/RideMessagesDashboard";
import { passengerNavItems } from "@/app/passenger/passengerNav";
import { TriWheelLoadingScreen } from "@/components/TriWheelLoadingScreen";
import { logoutTriWheel } from "@/lib/logout";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

function PassengerMessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rideParam = searchParams.get("ride");
  const initialRideId = rideParam ? Number(rideParam) : null;
  const { isChecking, user } = useStoredTriWheelSession();

  useEffect(() => {
    if (!isChecking && user?.role !== "passenger") {
      router.replace("/login?role=passenger");
    }
  }, [isChecking, router, user]);

  function handleLogout() {
    void logoutTriWheel();
  }

  if (isChecking || !user || user.role !== "passenger") {
    return (
      <TriWheelLoadingScreen
        message="Loading your trip messages."
        title="Passenger Messages"
      />
    );
  }

  return (
    <AppShell
      dashboardLabel="Passenger Dashboard"
      navItems={passengerNavItems}
      onLogout={handleLogout}
      user={user}
    >
      <RideMessagesDashboard
        backHref="/passenger"
        initialRideId={Number.isFinite(initialRideId) ? initialRideId : null}
        userId={user.id}
        viewerRole="passenger"
      />
    </AppShell>
  );
}

export default function PassengerMessagesPage() {
  return (
    <Suspense
      fallback={
        <TriWheelLoadingScreen
          message="Loading your trip messages."
          title="Passenger Messages"
        />
      }
    >
      <PassengerMessagesContent />
    </Suspense>
  );
}
