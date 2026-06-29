"use client";

import { useStoredTriWheelSession } from "@/app/admin/AdminAccessGate";
import { AppShell } from "@/components/AppShell";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { TriWheelLoadingScreen } from "@/components/TriWheelLoadingScreen";
import { logoutTriWheel } from "@/lib/logout";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { driverNavItems } from "../driverNav";

export default function DriverNotificationsPage() {
  const router = useRouter();
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
        message="Loading your notifications."
        title="Driver Notifications"
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
      <NotificationsPanel
        backHref="/driver"
        dashboardHref="/driver"
        userId={user.id}
      />
    </AppShell>
  );
}
