type DetailLine = {
  label: string;
  value: string;
};

const FIELD_LABELS: Record<string, string> = {
  previous_status: "Previous status",
  status: "Status",
  admin_notes: "Admin notes",
  approval_status: "Approval",
  rejection_reason: "Rejection reason",
  is_suspended: "Suspended",
  suspension_reason: "Suspension reason",
  is_verified: "Verified",
  previous_driver_id: "Previous driver",
  driver_id: "Driver",
  reason: "Reason",
  name: "Name",
  email: "Email",
  contact_number: "Contact",
  role: "Role",
  admin_role: "Admin role",
  platform_name: "Platform name",
  default_language: "Default language",
  timezone: "Timezone",
  date_format: "Date format",
  currency_code: "Currency code",
  currency_symbol: "Currency symbol",
  allow_passenger_registration: "Passenger registration",
  allow_driver_registration: "Driver registration",
  require_driver_admin_approval: "Driver approval required",
  operators_can_suspend_users: "Operators can suspend",
  operators_can_manage_reports: "Operators manage reports",
  operators_can_approve_drivers: "Operators approve drivers",
};

function humanizeKey(key: string) {
  return FIELD_LABELS[key] ?? key.replaceAll("_", " ");
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

export function formatAuditDetailLines(
  action: string,
  details: Record<string, unknown> | null,
): DetailLine[] {
  if (!details) {
    return [];
  }

  const lines: DetailLine[] = [];
  const consumed = new Set<string>();

  if (
    "previous_status" in details &&
    "status" in details &&
    details.previous_status !== details.status
  ) {
    lines.push({
      label: "Status change",
      value: `${formatValue(details.previous_status)} → ${formatValue(details.status)}`,
    });
    consumed.add("previous_status");
    consumed.add("status");
  }

  if (action === "user.suspended" || action === "user.unsuspended") {
    lines.push({
      label: "Account",
      value: action === "user.suspended" ? "Suspended" : "Reactivated",
    });
  }

  if (action === "user.soft_deleted" || action === "user.restored" || action === "user.purged" || action === "user.restore_appeal_submitted") {
    lines.push({
      label: "Account",
      value:
        action === "user.soft_deleted"
          ? "Deleted (stored 3 months)"
          : action === "user.restored"
            ? "Restored"
            : action === "user.purged"
              ? "Permanently purged"
              : "Restore appeal submitted",
    });
  }

  for (const [key, value] of Object.entries(details)) {
    if (consumed.has(key)) {
      continue;
    }

    if (value === null || value === undefined || value === "") {
      continue;
    }

    lines.push({
      label: humanizeKey(key),
      value: formatValue(value),
    });
  }

  return lines;
}

export function formatAuditAction(action: string) {
  return action
    .replaceAll(".", " · ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
