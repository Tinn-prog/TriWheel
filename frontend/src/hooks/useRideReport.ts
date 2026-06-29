"use client";

import { apiRoutes } from "@/lib/api";
import type { ReportReasonCode } from "@/lib/rideReports";
import { useCallback, useState } from "react";

export function useRideReport(userId: number | undefined, onSuccess?: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submitReport = useCallback(
    async (
      rideId: number,
      payload: {
        report_reason_code: ReportReasonCode;
        report_reason_detail?: string;
      },
    ) => {
      if (!userId) {
        return false;
      }

      setError("");
      setIsSubmitting(true);

      try {
        const response = await fetch(apiRoutes.rideReport(rideId), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            report_reason_code: payload.report_reason_code,
            report_reason_detail: payload.report_reason_detail,
          }),
        });
        const data = (await response.json()) as { message?: string };

        if (!response.ok) {
          throw new Error(data.message ?? "Unable to submit report.");
        }

        onSuccess?.();
        return true;
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to submit report.",
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSuccess, userId],
  );

  return {
    error,
    isSubmitting,
    setError,
    submitReport,
  };
}
