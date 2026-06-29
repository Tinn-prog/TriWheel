"use client";

import { useEffect } from "react";

export function useLiveDashboardRefresh(
  refresh: () => void | Promise<void>,
  enabled = true,
  intervalMs = 8000,
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const runRefresh = () => {
      void refresh();
    };

    const interval = window.setInterval(runRefresh, intervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        runRefresh();
      }
    };

    window.addEventListener("focus", runRefresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", runRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, intervalMs, refresh]);
}
