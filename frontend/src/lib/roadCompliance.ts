import { apiRoutes } from "./api";

export type ComplianceIssue = {
  code: string;
  message: string;
  severity: "block" | "warn" | "info";
};

export type ComplianceResult = {
  allowed: boolean;
  level: "ok" | "warn" | "block";
  issues: ComplianceIssue[];
};

export async function checkRideCompliance(payload: {
  ride_type: string;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  is_emergency?: boolean;
}): Promise<ComplianceResult> {
  const response = await fetch(apiRoutes.rideComplianceCheck, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  let data: ComplianceResult & { message?: string };

  try {
    data = JSON.parse(raw) as ComplianceResult & { message?: string };
  } catch {
    throw new Error("Unable to check route compliance. Please try again.");
  }

  if (!response.ok) {
    if (data.issues) {
      return data;
    }

    throw new Error(data.message ?? "Unable to check route compliance.");
  }

  return data;
}

export function complianceSummary(result: ComplianceResult): string {
  if (!result.issues.length) {
    return "";
  }

  return result.issues.map((issue) => issue.message).join(" ");
}
