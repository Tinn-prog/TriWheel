"use client";

import { apiRoutes } from "@/lib/api";
import { useLiveDashboardRefresh } from "@/hooks/useLiveDashboardRefresh";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DriverOverview } from "./driverTypes";

export function useDriverOverview(userId: number | undefined) {
  const [overview, setOverview] = useState<DriverOverview | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const autoOfferInFlightRef = useRef(false);

  const loadOverview = useCallback(async (id: number) => {
    const response = await fetch(`${apiRoutes.driverOverview}?user_id=${id}`);
    const data = (await response.json()) as DriverOverview | { message?: string };

    if (!response.ok) {
      throw new Error("message" in data ? data.message : "Unable to load driver dashboard.");
    }

    setOverview(data as DriverOverview);
  }, []);

  const refreshDashboard = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      await loadOverview(userId);
    } catch {
      // Keep the last good dashboard snapshot during background refresh.
    }
  }, [loadOverview, userId]);

  useLiveDashboardRefresh(refreshDashboard, Boolean(userId));

  useEffect(() => {
    if (!userId) {
      return;
    }

    const resolvedUserId = userId;

    async function loadDashboard() {
      try {
        await loadOverview(resolvedUserId);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load driver dashboard.",
        );
      }
    }

    void loadDashboard();
  }, [loadOverview, userId]);

  const processAutoOffers = useCallback(
    async (currentOverview: DriverOverview) => {
      if (!userId || autoOfferInFlightRef.current) {
        return;
      }

      if (
        !currentOverview.driver.auto_accept ||
        currentOverview.driver.status !== "online" ||
        currentOverview.driver.approval_status !== "approved" ||
        currentOverview.active_ride
      ) {
        return;
      }

      const ridesToOffer = currentOverview.available_requests.filter(
        (ride) => ride.driver_offer_status !== "pending",
      );

      if (!ridesToOffer.length) {
        return;
      }

      autoOfferInFlightRef.current = true;

      try {
        for (const ride of ridesToOffer) {
          const response = await fetch(apiRoutes.driverRideOffer(ride.id), {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ user_id: userId }),
          });

          if (!response.ok) {
            break;
          }
        }

        await loadOverview(userId);
      } finally {
        autoOfferInFlightRef.current = false;
      }
    },
    [loadOverview, userId],
  );

  useEffect(() => {
    if (!overview) {
      return;
    }

    void processAutoOffers(overview);
  }, [overview, processAutoOffers]);

  async function updateAutoAccept(enabled: boolean) {
    if (!userId) {
      return;
    }

    setError("");
    setNotice("");
    setBusyAction("auto-accept");

    try {
      const response = await fetch(apiRoutes.driverAutoAccept, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auto_accept: enabled,
          user_id: userId,
        }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to update auto-accept.");
      }

      setNotice(data.message ?? "Auto-accept updated.");
      await loadOverview(userId);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update auto-accept.",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function runDriverAction(
    actionName: string,
    endpoint: string,
    successFallback: string,
    body: Record<string, unknown> = {},
  ): Promise<boolean> {
    if (!userId) {
      return false;
    }

    setError("");
    setNotice("");
    setBusyAction(actionName);

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: userId, ...body }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? successFallback);
      }

      setNotice(data.message ?? successFallback);
      await loadOverview(userId);
      return true;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Driver action failed.",
      );
      return false;
    } finally {
      setBusyAction("");
    }
  }

  return {
    busyAction,
    error,
    loadOverview,
    notice,
    overview,
    runDriverAction,
    setError,
    setNotice,
    updateAutoAccept,
  };
}
