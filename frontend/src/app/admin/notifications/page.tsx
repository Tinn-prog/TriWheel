"use client";

import { NotificationsPanel } from "@/components/NotificationsPanel";
import { TriWheelLoadingScreen } from "@/components/TriWheelLoadingScreen";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStoredTriWheelSession } from "../AdminAccessGate";

export default function AdminNotificationsPage() {
  const router = useRouter();
  const { isChecking, user } = useStoredTriWheelSession();

  useEffect(() => {
    if (!isChecking && user?.role !== "admin") {
      router.replace("/login?role=passenger");
    }
  }, [isChecking, router, user]);

  if (isChecking || !user || user.role !== "admin") {
    return (
      <TriWheelLoadingScreen
        message="Loading admin notifications."
        title="Admin Notifications"
      />
    );
  }

  return (
    <NotificationsPanel
      backHref="/admin"
      dashboardHref="/admin"
      userId={user.id}
    />
  );
}
