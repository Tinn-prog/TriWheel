"use client";

import { useStoredTriWheelSession } from "@/app/admin/AdminAccessGate";
import { AppShell } from "@/components/AppShell";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { TriWheelLoadingScreen } from "@/components/TriWheelLoadingScreen";
import { logoutTriWheel } from "@/lib/logout";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const passengerNavItems = [
  {
    href: "/passenger#book-ride",
    isDefaultSection: true,
    label: "Book Ride",
    shortLabel: "Book",
  },
  { href: "/passenger#active-ride", label: "Active Ride", shortLabel: "Active" },
  { href: "/passenger/notifications", label: "Notifications", shortLabel: "Alerts" },
  { href: "/passenger/history", label: "Ride History", shortLabel: "History" },
  { href: "/settings", label: "Profile", shortLabel: "Profile" },
];

export default function PassengerNotificationsPage() {
  const router = useRouter();
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
        message="Loading your notifications."
        title="Passenger Notifications"
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
      <NotificationsPanel
        backHref="/passenger"
        dashboardHref="/passenger"
        userId={user.id}
      />
    </AppShell>
  );
}
