import { parseStoredTriWheelUser } from "@/app/admin/AdminAccessGate";
import { readStoredUserRaw } from "@/lib/authStorage";

export function dashboardPathForRole(role?: string) {
  if (role === "driver") {
    return "/driver";
  }

  if (role === "admin") {
    return "/admin";
  }

  return "/passenger";
}

export function resolveNotificationHref(
  actionUrl: string | null,
  fallbackHref: string,
) {
  if (!actionUrl) {
    return null;
  }

  if (!actionUrl.startsWith("/")) {
    return fallbackHref;
  }

  if (typeof window === "undefined") {
    return actionUrl;
  }

  const storedUser = parseStoredTriWheelUser(readStoredUserRaw());

  if (!storedUser || !actionUrl.startsWith("/login")) {
    return actionUrl;
  }

  if (actionUrl.includes("role=driver")) {
    return "/driver";
  }

  if (actionUrl.includes("role=admin")) {
    return "/admin";
  }

  return dashboardPathForRole(storedUser.role);
}
