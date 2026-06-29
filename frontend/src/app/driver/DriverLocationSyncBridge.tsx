"use client";

import { useStoredTriWheelSession } from "@/app/admin/AdminAccessGate";
import { useDriverLocationSync } from "@/hooks/useDriverLocationSync";
import { apiRoutes } from "@/lib/api";
import { useEffect, useState } from "react";

type DriverSyncState = {
  enabled: boolean;
  urgent: boolean;
};

export function DriverLocationSyncBridge() {
  const { user } = useStoredTriWheelSession() as {
    user: { id: number; role: string } | null;
  };
  const [syncState, setSyncState] = useState<DriverSyncState>({
    enabled: false,
    urgent: false,
  });

  useEffect(() => {
    if (!user?.id || user.role !== "driver") {
      setSyncState({ enabled: false, urgent: false });
      return;
    }

    const driverUserId = user.id;
    let cancelled = false;

    async function refreshSyncState() {
      try {
        const response = await fetch(
          `${apiRoutes.driverOverview}?user_id=${driverUserId}`,
        );
        const data = (await response.json()) as {
          active_ride?: { status?: string } | null;
          driver?: { status?: string };
        };

        if (!response.ok || cancelled) {
          return;
        }

        const activeRideStatus = data.active_ride?.status ?? "";
        const hasActiveTrip = ["accepted", "ongoing"].includes(activeRideStatus);
        const isOnline = data.driver?.status === "online";

        setSyncState({
          enabled: isOnline || hasActiveTrip,
          urgent: hasActiveTrip,
        });
      } catch {
        if (!cancelled) {
          setSyncState({ enabled: false, urgent: false });
        }
      }
    }

    void refreshSyncState();
    const interval = window.setInterval(() => {
      void refreshSyncState();
    }, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user?.id, user?.role]);

  useDriverLocationSync(user?.id, syncState.enabled, { urgent: syncState.urgent });

  return null;
}
