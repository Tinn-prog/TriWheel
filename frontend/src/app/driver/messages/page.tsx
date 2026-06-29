"use client";

import { Suspense } from "react";
import { useStoredTriWheelSession } from "@/app/admin/AdminAccessGate";
import { AppShell } from "@/components/AppShell";
import { RideMessagesDashboard } from "@/components/RideMessagesDashboard";
import { driverNavItems } from "@/app/driver/driverNav";
import { TriWheelLoadingScreen } from "@/components/TriWheelLoadingScreen";
import { logoutTriWheel } from "@/lib/logout";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

function DriverMessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rideParam = searchParams.get("ride");
  const initialRideId = rideParam ? Number(rideParam) : null;
  const { isChecking, user } = useStoredTriWheelSession();

  useEffect(() => {
    if (!isChecking && user?.role !== "driver") {
      router.replace("/login?role=driver");
    }
  }, [isChecking, router, user]);

  function handleLogout() {
    void logoutTriWheel();
  }

  if (isChecking || !user || user.role !== "driver") {
    return (
      <TriWheelLoadingScreen
        message="Loading your trip messages."
        title="Driver Messages"
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
      <RideMessagesDashboard
        backHref="/driver"
        initialRideId={Number.isFinite(initialRideId) ? initialRideId : null}
        userId={user.id}
        viewerRole="driver"
      />
    </AppShell>
  );
}

export default function DriverMessagesPage() {
  return (
    <Suspense
      fallback={
        <TriWheelLoadingScreen
          message="Loading your trip messages."
          title="Driver Messages"
        />
      }
    >
      <DriverMessagesContent />
    </Suspense>
  );
}
