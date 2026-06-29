"use client";

import { fetchDirections } from "@/lib/mapClient";
import type { Point, RouteSummary } from "@/lib/mapTypes";
import { useEffect } from "react";

export function ApiDirectionsLoader({
  from,
  onRoute,
  onStatus,
  to,
}: {
  from: Point | null;
  onRoute: (summary: RouteSummary | null) => void;
  onStatus?: (message: string) => void;
  to: Point | null;
}) {
  useEffect(() => {
    if (!from || !to) {
      onRoute(null);
      return;
    }

    let cancelled = false;
    onStatus?.("Calculating route...");

    void fetchDirections(from, to)
      .then((summary) => {
        if (!cancelled) {
          onRoute(summary);
          onStatus?.(
            summary.source === "road"
              ? "Using road route."
              : "Using straight-line route estimate.",
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          onRoute(null);
          onStatus?.("Unable to calculate route.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [from, onRoute, onStatus, to]);

  return null;
}
