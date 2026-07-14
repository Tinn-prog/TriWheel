import { formatDateTime } from "@/lib/formatDateTime";

export type ProfileSnapshot = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  currentAddress: string;
  driverPhone: string;
};

export type ProfileFieldChange = {
  field: string;
  label: string;
  old_value: string | null;
  new_value: string | null;
};

export type ProfileChangeLimit = {
  monthly_limit: number;
  changes_used: number;
  changes_remaining: number;
  resets_at: string;
  applies: boolean;
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim();
}

function displayValue(value: string | null | undefined) {
  const normalized = normalize(value);

  return normalized === "" ? "(empty)" : normalized;
}

export function snapshotFromForm(input: {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  currentAddress: string;
  driverPhone: string;
}): ProfileSnapshot {
  return {
    firstName: normalize(input.firstName),
    middleName: normalize(input.middleName),
    lastName: normalize(input.lastName),
    email: normalize(input.email),
    contactNumber: normalize(input.contactNumber),
    currentAddress: normalize(input.currentAddress),
    driverPhone: normalize(input.driverPhone),
  };
}

export function buildProfileChanges(
  baseline: ProfileSnapshot,
  current: ProfileSnapshot,
  options: { hasNewPhoto: boolean; includeDriverPhone: boolean },
): ProfileFieldChange[] {
  const changes: ProfileFieldChange[] = [];

  const compare = (
    field: string,
    label: string,
    oldValue: string,
    newValue: string,
  ) => {
    if (oldValue === newValue) {
      return;
    }

    changes.push({
      field,
      label,
      old_value: oldValue === "" ? null : oldValue,
      new_value: newValue === "" ? null : newValue,
    });
  };

  compare("first_name", "First name", baseline.firstName, current.firstName);
  compare("middle_name", "Middle name", baseline.middleName, current.middleName);
  compare("last_name", "Last name", baseline.lastName, current.lastName);
  compare("email", "Email address", baseline.email, current.email);
  compare("contact_number", "Contact number", baseline.contactNumber, current.contactNumber);
  compare("current_address", "Current address", baseline.currentAddress, current.currentAddress);

  if (options.includeDriverPhone) {
    compare("phone", "Driver phone", baseline.driverPhone, current.driverPhone);
  }

  if (options.hasNewPhoto) {
    changes.push({
      field: "profile_photo",
      label: "Profile photo",
      old_value: "Previous photo",
      new_value: "New photo",
    });
  }

  return changes;
}

export function formatProfileChangeDescription(
  changes: ProfileFieldChange[],
  limit?: ProfileChangeLimit | null,
) {
  const lines = changes.map((change) => {
    if (change.field === "profile_photo") {
      return `• ${change.label}: ${change.new_value}`;
    }

    return `• ${change.label}: ${displayValue(change.old_value)} → ${displayValue(change.new_value)}`;
  });

  let message = "You are about to update the following profile details:\n\n";
  message += lines.join("\n");

  if (limit?.applies) {
    message += `\n\nThis will use 1 of your ${limit.changes_remaining} remaining profile update${
      limit.changes_remaining === 1 ? "" : "s"
    } for this month.`;
  }

  return message;
}

export function formatProfileLimitSummary(limit: ProfileChangeLimit) {
  const resetDate = formatDateTime(limit.resets_at, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return `${limit.changes_remaining} of ${limit.monthly_limit} profile updates remaining this month. Resets on ${resetDate}.`;
}

export type PasswordChangeLimit = {
  monthly_limit: number;
  changes_used: number;
  changes_remaining: number;
  resets_at: string;
};

export function formatPasswordLimitSummary(limit: PasswordChangeLimit) {
  const resetDate = formatDateTime(limit.resets_at, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return `${limit.changes_remaining} of ${limit.monthly_limit} password changes remaining this month. Resets on ${resetDate}.`;
}

export function formatPasswordChangeConfirmation(limit: PasswordChangeLimit) {
  return `You are about to change your account password.\n\nFor your security, password changes are kept separate from profile details.\n\nThis will use 1 of your ${limit.changes_remaining} remaining password change${
    limit.changes_remaining === 1 ? "" : "s"
  } for this month.`;
}
